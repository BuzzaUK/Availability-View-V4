const nodemailer = require('nodemailer');

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
  // Create transporter
  const port = parseInt(process.env.EMAIL_PORT, 10);
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: isNaN(port) ? undefined : port,
    secure: port === 465, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  // Normalize option keys
  const to = options.email || options.to;
  const text = options.message || options.text || '';
  const html = options.html || '';
  const from = options.from || `${process.env.EMAIL_FROM}`;

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

  // Send email
  const info = await transporter.sendMail(mailOptions);

  console.log(`Email sent: ${info.messageId}`);
  
  return info;
};

module.exports = sendEmail;