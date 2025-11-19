import nodemailer from 'nodemailer';
import config from '../config/env';
import logger from '../config/logger';

/**
 * Email Service Utility
 * Handles sending emails for OTP verification and other notifications
 */

let transporter: nodemailer.Transporter | null = null;

/**
 * Initialize email transporter
 * Supports SendGrid, SMTP, or other email services
 */
export const initializeEmailService = async () => {
  try {
    if (config.emailService === 'sendgrid') {
      // SendGrid configuration
      if (!config.sendgridApiKey) {
        throw new Error('SENDGRID_API_KEY not configured');
      }

      transporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        auth: {
          user: 'apikey',
          pass: config.sendgridApiKey,
        },
      });
    } else {
      // SMTP configuration
      if (!config.smtpHost || !config.smtpPort) {
        throw new Error('SMTP configuration not complete');
      }

      transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        auth: {
          user: config.smtpUser,
          pass: config.smtpPass,
        },
      });
    }

    // Test transporter connection
    await transporter.verify();
    logger.info('✅ Email service initialized successfully');
    return transporter;
  } catch (error) {
    logger.error('❌ Failed to initialize email service', { error });
    throw error;
  }
};

/**
 * Get email transporter instance
 */
export const getEmailTransporter = () => {
  if (!transporter) {
    throw new Error('Email service not initialized. Call initializeEmailService() first.');
  }
  return transporter;
};

/**
 * Send OTP verification email
 */
export const sendOtpEmail = async (email: string, otp: string, fullName?: string) => {
  try {
    const emailTransporter = getEmailTransporter();

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #6366f1; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9fafb; padding: 20px; }
            .otp-box { background-color: white; padding: 20px; text-align: center; border: 2px solid #6366f1; border-radius: 5px; margin: 20px 0; }
            .otp-code { font-size: 32px; font-weight: bold; color: #6366f1; letter-spacing: 5px; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #999; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Email Verification</h1>
            </div>
            <div class="content">
              <p>Hi ${fullName || 'there'},</p>
              <p>Welcome to AI-NFT Platform! To complete your registration, please verify your email using the code below.</p>
              
              <div class="otp-box">
                <p style="margin: 0; font-size: 14px; color: #666;">Your verification code is:</p>
                <div class="otp-code">${otp}</div>
                <p style="margin: 10px 0 0 0; font-size: 12px; color: #999;">This code expires in 10 minutes</p>
              </div>

              <p style="color: #666; font-size: 14px;">
                <strong>Security tip:</strong> Never share this code with anyone. Our team will never ask for your verification code.
              </p>

              <p style="margin-top: 30px; color: #999; font-size: 12px;">
                If you didn't request this email, you can safely ignore it.
              </p>
            </div>
            <div class="footer">
              <p>&copy; 2025 AI-NFT Platform. All rights reserved.</p>
              <p>If you have questions, contact us at ${config.emailFrom}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const mailOptions = {
      from: config.emailFrom,
      to: email,
      subject: '🔐 Verify Your Email - AI-NFT Platform',
      html: htmlContent,
      text: `Your verification code is: ${otp}\nThis code expires in 10 minutes.`,
    };

    const result = await emailTransporter.sendMail(mailOptions);

    logger.info('✅ OTP email sent successfully', {
      email,
      messageId: result.messageId,
    });

    return true;
  } catch (error) {
    logger.error('❌ Failed to send OTP email', {
      email,
      error: error instanceof Error ? error.message : error,
    });
    throw error;
  }
};

/**
 * Send welcome email after successful registration
 */
export const sendWelcomeEmail = async (email: string, fullName?: string) => {
  try {
    const emailTransporter = getEmailTransporter();

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #6366f1; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9fafb; padding: 20px; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #999; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome!</h1>
            </div>
            <div class="content">
              <p>Hi ${fullName || 'there'},</p>
              <p>Welcome to AI-NFT Platform! Your email has been verified and you're all set to start creating and trading NFTs.</p>
              
              <p style="margin-top: 20px;">
                <a href="${config.apiUrl}/login" style="background-color: #6366f1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Sign In Now</a>
              </p>

              <p style="margin-top: 30px; color: #666; font-size: 14px;">
                Need help? Check out our <a href="${config.apiUrl}/docs" style="color: #6366f1;">documentation</a>.
              </p>
            </div>
            <div class="footer">
              <p>&copy; 2025 AI-NFT Platform. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const mailOptions = {
      from: config.emailFrom,
      to: email,
      subject: '🎉 Welcome to AI-NFT Platform!',
      html: htmlContent,
      text: `Welcome to AI-NFT Platform! Your email has been verified.`,
    };

    await emailTransporter.sendMail(mailOptions);

    logger.info('✅ Welcome email sent successfully', { email });
    return true;
  } catch (error) {
    logger.error('❌ Failed to send welcome email', {
      email,
      error: error instanceof Error ? error.message : error,
    });
    // Don't throw - this is non-critical
    return false;
  }
};

export default {
  initializeEmailService,
  getEmailTransporter,
  sendOtpEmail,
  sendWelcomeEmail,
};
