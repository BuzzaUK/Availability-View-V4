const nodemailer = require('nodemailer');
const databaseService = require('../services/databaseService');

/**
 * Send email using nodemailer
 * Accepts both our legacy options (email, message) and alternate keys (to, text)
 * @param {Object} options - Email options
 * @param {string} [options.email] - Recipient email
 * @param {string} [options.to] - Recipient email (alias of email)
 * @param {string} options.subject - Email subject
 * @param {string} [options.message] - Email message (text)
 * @param {string} [options.text] - Email message (text, alias of message)
 * @param {string} [options.html] - Email message (HTML)
 * @param {string} [options.from] - From header override
 * @param {string|string[]} [options.cc] - CC recipients
 * @param {string|string[]} [options.bcc] - BCC recipients
 * @param {Array} [options.attachments] - Nodemailer attachments
 */
const sendEmail = async (options) => {
  // Get email settings from database
  const settings = await databaseService.getNotificationSettings();
  const emailSettings = settings.emailSettings;
  
  if (!emailSettings || !emailSettings.smtpServer || !emailSettings.username || !emailSettings.password) {
    throw new Error('Email configuration not found or incomplete. Please configure email settings in the notification settings.');
  }
  
  // Create transporter using database settings with timeout configurations
  const transporter = nodemailer.createTransport({
    host: emailSettings.smtpServer,
    port: parseInt(emailSettings.port, 10),
    secure: parseInt(emailSettings.port, 10) === 465, // true for 465, false for other ports
    auth: {
      user: emailSettings.username,
      pass: emailSettings.password
    },
    tls: {
      rejectUnauthorized: false
    },
    // Add timeout configurations to prevent hanging
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 5000,    // 5 seconds
    socketTimeout: 15000      // 15 seconds
  });

  // Normalize option keys
  const to = options.email || options.to;
  const text = options.message || options.text || '';
  const html = options.html || '';
  const from = options.from || emailSettings.fromEmail || emailSettings.username;

  if (!to) {
    throw new Error('Recipient email is required');
  }

  // Define email options
  const mailOptions = {
    from,
    to,
    subject: options.subject,
    text,
    html,
    cc: options.cc,
    bcc: options.bcc,
    attachments: options.attachments
  };

  // Send email with additional timeout wrapper to prevent hanging
  const emailTimeout = 30000; // 30 seconds total timeout
  
  const info = await Promise.race([
    transporter.sendMail(mailOptions),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Email sending timeout after 30 seconds')), emailTimeout)
    )
  ]);

  console.log(`Email sent: ${info.messageId}`);
  
  return info;
};

module.exports = sendEmail;