const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const databaseService = require('../services/databaseService');
const sendEmail = require('../utils/sendEmail');
const { Invitation, User } = require('../models/database');
const nodemailer = require('nodemailer');

// @desc    Send invitation to new user
// @route   POST /api/invitations/send
// @access  Private (Admin only)
exports.sendInvitation = async (req, res) => {
  console.log('🚀 INVITATION CONTROLLER: sendInvitation called with:', req.body);
  try {
    // Check permissions - only admins and super_admins can send invitations
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to send invitations'
      });
    }

    const { email, role = 'viewer', receive_shift_reports = false, metadata = {} } = req.body;
    
    // Validation
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Check if user already exists in database
    const existingUser = await databaseService.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Check if there's already a pending invitation for this email
    let existingInvitation;
    try {
      existingInvitation = await Invitation.findOne({ 
        where: { 
          email: email.toLowerCase(),
          status: 'pending'
        } 
      });
    } catch (error) {
      // If Invitation model doesn't exist in SQL, continue with memory-only approach
      console.log('Using memory-only invitation tracking');
    }

    if (existingInvitation) {
      return res.status(400).json({
        success: false,
        message: 'A pending invitation already exists for this email'
      });
    }

    // Generate invitation token
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(inviteToken).digest('hex');
    
    // Set expiration (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Store invitation in SQL database if available, otherwise skip SQL storage
    let invitation = null;
    try {
      invitation = await Invitation.create({
        email: email.toLowerCase(),
        role,
        token_hash: tokenHash,
        expires_at: expiresAt,
        invited_by_user_id: req.user.id || req.user._id,
        status: 'pending',
        receive_shift_reports,
        metadata
      });
    } catch (error) {
      console.log('SQL invitation storage not available, using token-based approach');
    }

    // Create invitation URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const inviteUrl = `${frontendUrl}/accept-invitation?token=${inviteToken}&email=${encodeURIComponent(email)}`;

    // Create email content
    const emailSubject = 'You\'re invited to join Asset Logger System';
    const emailText = `
Hello,

You have been invited to join the Asset Logger System.

Your assigned role: ${role.charAt(0).toUpperCase() + role.slice(1)}
Shift reports: ${receive_shift_reports ? 'Enabled' : 'Disabled'}

To accept this invitation and create your account, please click the link below:
${inviteUrl}

This invitation will expire in 7 days.

If you did not expect this invitation, you can safely ignore this email.

Best regards,
Asset Logger System Team
    `;

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2196F3; color: white; padding: 20px; text-align: center; }
        .content { background: #f9f9f9; padding: 30px; }
        .button { 
            display: inline-block; 
            background: #2196F3; 
            color: white; 
            padding: 12px 30px; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 20px 0; 
        }
        .footer { background: #eee; padding: 20px; text-align: center; color: #666; }
        .details { background: white; padding: 15px; border-left: 4px solid #2196F3; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to Asset Logger System</h1>
        </div>
        <div class="content">
            <h2>You're Invited!</h2>
            <p>Hello,</p>
            <p>You have been invited to join the Asset Logger System. This platform helps monitor and track asset performance in real-time.</p>
            
            <div class="details">
                <h3>Invitation Details:</h3>
                <p><strong>Role:</strong> ${role.charAt(0).toUpperCase() + role.slice(1)}</p>
                <p><strong>Shift Reports:</strong> ${receive_shift_reports ? 'Enabled' : 'Disabled'}</p>
                <p><strong>Expires:</strong> ${expiresAt.toLocaleDateString()}</p>
            </div>

            <p>To accept this invitation and create your account, click the button below:</p>
            
            <a href="${inviteUrl}" class="button">Accept Invitation</a>
            
            <p>Or copy and paste this URL into your browser:</p>
            <p style="word-break: break-all; background: #f0f0f0; padding: 10px;">${inviteUrl}</p>
            
            <p><em>This invitation will expire in 7 days.</em></p>
        </div>
        <div class="footer">
            <p>If you did not expect this invitation, you can safely ignore this email.</p>
            <p>Asset Logger System Team</p>
        </div>
    </div>
</body>
</html>
    `;

    // Send invitation email using environment variables
    try {
      console.log('🔍 Using email settings from environment variables');
      console.log('🔍 EMAIL_HOST:', process.env.EMAIL_HOST);
      console.log('🔍 EMAIL_PORT:', process.env.EMAIL_PORT);
      console.log('🔍 EMAIL_USER:', process.env.EMAIL_USER);
      
      // Create transporter using environment variables (same as sendEmail.js)
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: false, // true for 465, false for other ports like 587
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
        tls: {
          ciphers: 'SSLv3',
          rejectUnauthorized: false
        }
      });

      // Verify the connection configuration
      console.log('🔍 Verifying SMTP connection...');
      await transporter.verify();
      console.log('🔍 SMTP connection verified successfully');

      const mailOptions = {
        from: `"Industrial Monitoring Dashboard" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Invitation to Industrial Monitoring Dashboard',
        text: `You have been invited to join the Industrial Monitoring Dashboard. Please click the following link to complete your registration: ${inviteUrl}`,
         html: `
           <h2>🎉 You're Invited!</h2>
           <p>You have been invited to join the <strong>Industrial Monitoring Dashboard</strong> as a <strong>${role}</strong>.</p>
           <p>Please click the button below to complete your registration:</p>
           <div style="text-align: center; margin: 20px 0;">
             <a href="${inviteUrl}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Complete Registration</a>
           </div>
           <p>Or copy and paste this link into your browser:</p>
           <p><a href="${inviteUrl}">${inviteUrl}</a></p>
           <hr>
           <p><em>This invitation will expire in 7 days.</em></p>
           <p><em>Industrial Monitoring Dashboard</em></p>
         `
      };

      console.log('🔍 Sending invitation email...');
      const info = await transporter.sendMail(mailOptions);
      console.log('🔍 Invitation email sent successfully:', info.messageId);
      
      res.status(200).json({
        success: true,
        message: 'Invitation sent successfully',
        data: {
          email,
          role,
          expires_at: expiresAt,
          receive_shift_reports,
          invitation_url: inviteUrl
        }
      });

    } catch (emailError) {
      console.error('❌ Failed to send invitation email:', emailError.message);
      
      // Fallback: Return invitation URL when email fails
      console.log(`🔗 Email failed, providing invitation URL for ${email}: ${inviteUrl}`);
      
      res.status(200).json({
        success: true,
        message: 'Invitation created successfully (Email service unavailable)',
        data: {
          email,
          role,
          expires_at: expiresAt,
          receive_shift_reports,
          invitation_url: inviteUrl,
          note: 'Email could not be sent. Use the invitation_url to manually invite the user.',
          email_error: emailError.message
        }
      });
      return;
    }

  } catch (error) {
    console.error('❌ Send invitation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Accept invitation and create user account
// @route   POST /api/invitations/accept
// @access  Public
exports.acceptInvitation = async (req, res) => {
  try {
    const { token, email, name, password } = req.body;

    // Validation
    if (!token || !email || !name || !password) {
      return res.status(400).json({
        success: false,
        message: 'Token, email, name, and password are required'
      });
    }

    // Hash the token to match stored hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find invitation in SQL database
    let invitation = null;
    try {
      invitation = await Invitation.findOne({
        where: {
          email: email.toLowerCase(),
          token_hash: tokenHash,
          status: 'pending'
        }
      });
    } catch (error) {
      console.log('SQL invitation lookup failed, using token-based validation');
    }

    // For development/memory-only mode, validate token format and email
    if (!invitation) {
      // Basic validation - in production you'd want more security
      if (token.length !== 64) { // 32 bytes = 64 hex chars
        return res.status(400).json({
          success: false,
          message: 'Invalid invitation token'
        });
      }
    }

    // Check if invitation exists and is valid (when SQL is available)
    if (invitation) {
      // Check if invitation has expired
      if (new Date() > invitation.expires_at) {
        // Mark as expired
        await Invitation.update(
          { status: 'expired' },
          { where: { id: invitation.id } }
        );

        return res.status(400).json({
          success: false,
          message: 'Invitation has expired'
        });
      }
    }

    // Check if user already exists
    const existingUser = await databaseService.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User account already exists'
      });
    }

    // Parse name into first_name and last_name
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Create user account
    const userData = {
      first_name: firstName,
      last_name: lastName,
      name: name,
      email: email.toLowerCase(),
      password: password,
      role: invitation ? invitation.role : 'viewer',
      isActive: true,
      shiftReportPreferences: {
        enabled: invitation ? invitation.receive_shift_reports : false,
        shifts: [],
        emailFormat: 'pdf'
      }
    };

    const newUser = await databaseService.createUser(userData);

    // Mark invitation as accepted (when SQL is available)
    if (invitation) {
      await Invitation.update(
        { 
          status: 'accepted',
          accepted_at: new Date()
        },
        { where: { id: invitation.id } }
      );
    }

    // Generate JWT token for immediate login
    const jwtToken = databaseService.generateJWT(newUser);

    // Remove password from response
    const { password: userPassword, ...userWithoutPassword } = newUser;

    console.log(`✅ User account created via invitation: ${email}`);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token: jwtToken,
      user: {
        id: newUser.id,
        name: newUser.name || `${newUser.first_name} ${newUser.last_name}`.trim(),
        email: newUser.email,
        role: newUser.role
      }
    });

  } catch (error) {
    console.error('❌ Accept invitation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get invitation details (for verification)
// @route   GET /api/invitations/verify/:token
// @access  Public
exports.verifyInvitation = async (req, res) => {
  try {
    const { token } = req.params;
    const { email } = req.query;

    if (!token || !email) {
      return res.status(400).json({
        success: false,
        message: 'Token and email are required'
      });
    }

    // Hash the token to match stored hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find invitation
    let invitation = null;
    try {
      invitation = await Invitation.findOne({
        where: {
          email: email.toLowerCase(),
          token_hash: tokenHash,
          status: 'pending'
        }
      });
    } catch (error) {
      console.log('SQL invitation lookup failed, using basic validation');
    }

    // For development/memory-only mode
    if (!invitation) {
      // Basic validation
      if (token.length !== 64) {
        return res.status(400).json({
          success: false,
          message: 'Invalid invitation token'
        });
      }

      // Return basic info for development
      return res.status(200).json({
        success: true,
        data: {
          email: email.toLowerCase(),
          role: 'viewer',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          receive_shift_reports: false
        }
      });
    }

    // Check if invitation has expired
    if (new Date() > invitation.expires_at) {
      await Invitation.update(
        { status: 'expired' },
        { where: { id: invitation.id } }
      );

      return res.status(400).json({
        success: false,
        message: 'Invitation has expired'
      });
    }

    // Return invitation details
    res.status(200).json({
      success: true,
      data: {
        email: invitation.email,
        role: invitation.role,
        expires_at: invitation.expires_at,
        receive_shift_reports: invitation.receive_shift_reports
      }
    });

  } catch (error) {
    console.error('❌ Verify invitation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get all pending invitations
// @route   GET /api/invitations
// @access  Private (Admin, Manager)
exports.getPendingInvitations = async (req, res) => {
  try {
    // Check permissions - only admins and super_admins can view pending invitations
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to view pending invitations'
      });
    }

    let invitations = [];
    
    try {
      invitations = await Invitation.findAll({
        where: { status: 'pending' },
        include: [
          {
            model: User,
            as: 'inviter',
            attributes: ['id', 'name', 'email']
          }
        ],
        order: [['created_at', 'DESC']]
      });
    } catch (error) {
      console.log('SQL invitation lookup not available');
    }

    res.status(200).json({
      success: true,
      data: invitations
    });

  } catch (error) {
    console.error('❌ Get pending invitations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Cancel invitation
// @route   DELETE /api/invitations/:id
// @access  Private (Admin only)
exports.cancelInvitation = async (req, res) => {
  try {
    // Check permissions - only admins and super_admins can cancel invitations
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to cancel invitations'
      });
    }

    const { id } = req.params;

    let invitation = null;
    try {
      invitation = await Invitation.findByPk(id);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Invitation not found'
      });
    }

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invitation not found'
      });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Can only cancel pending invitations'
      });
    }

    // Mark as cancelled
    await Invitation.update(
      { status: 'cancelled' },
      { where: { id: invitation.id } }
    );

    res.status(200).json({
      success: true,
      message: 'Invitation cancelled successfully'
    });

  } catch (error) {
    console.error('❌ Cancel invitation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};