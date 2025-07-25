import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MAILER_CONFIG } from '../config/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: MAILER_CONFIG.host,
            port: MAILER_CONFIG.port,
            secure: MAILER_CONFIG.secure,
            service: MAILER_CONFIG.service,
            auth: {
                user: MAILER_CONFIG.from,
                pass: MAILER_CONFIG.pass,
            },
        });
    }

    /**
     * Load HTML template and replace placeholders
     * @param {string} templateName - Name of the HTML template file
     * @param {Object} variables - Object containing variables to replace in template
     * @returns {string} - Processed HTML content
     */
    async loadTemplate(templateName, variables = {}) {
        try {
            const templatePath = path.join(__dirname, '../utils/html', `${templateName}.html`);
            let htmlContent = fs.readFileSync(templatePath, 'utf8');

            // Replace all variables in the template
            Object.keys(variables).forEach(key => {
                const regex = new RegExp(`{{${key}}}`, 'g');
                htmlContent = htmlContent.replace(regex, variables[key]);
            });

            return htmlContent;
        } catch (error) {
            console.error(`Error loading email template ${templateName}:`, error);
            throw new Error(`Failed to load email template: ${templateName}`);
        }
    }

    /**
     * Send email
     * @param {Object} options - Email options
     * @param {string} options.to - Recipient email
     * @param {string} options.subject - Email subject
     * @param {string} options.html - HTML content
     * @param {string} options.text - Plain text content (optional)
     * @returns {Promise} - Email send result
     */
    async sendEmail({ to, subject, html, text }) {
        try {
            const mailOptions = {
                from: MAILER_CONFIG.from,
                to,
                subject,
                html,
                text: text || '', // Fallback to empty string if no text provided
            };

            const result = await this.transporter.sendMail(mailOptions);
            // console.log(`Email sent successfully to ${to}:`, result.messageId);
            return result;
        } catch (error) {
            console.error(`Error sending email to ${to}:`, error);
            throw new Error(`Failed to send email: ${error.message}`);
        }
    }

    /**
     * Send forgot password email
     * @param {Object} options - Forgot password email options
     * @param {string} options.email - User email
     * @param {string} options.userName - User name
     * @param {string} options.resetLink - Password reset link
     * @param {string} options.expirationTime - Link expiration time
     * @returns {Promise} - Email send result
     */
    async sendForgotPasswordEmail({ email, userName, resetLink, expirationTime }) {
        try {
            const html = await this.loadTemplate('forgotPassword', {
                userName,
                resetLink,
                expirationTime,
            });

            return await this.sendEmail({
                to: email,
                subject: 'Reset Your Jarayid Password',
                html,
                text: `Hello ${userName}, 
                
You requested a password reset for your Jarayid account. 
Click the following link to reset your password: ${resetLink}

This link will expire in ${expirationTime}.

If you didn't request this, please ignore this email.

Best regards,
Jarayid Team`,
            });
        } catch (error) {
            console.error('Error sending forgot password email:', error);
            throw error;
        }
    }

    /**
     * Send password reset success email
     * @param {Object} options - Password reset success email options
     * @param {string} options.email - User email
     * @param {string} options.userName - User name
     * @param {string} options.resetDate - Date when password was reset
     * @returns {Promise} - Email send result
     */
    async sendPasswordResetSuccessEmail({ email, userName, resetDate }) {
        try {
            const html = await this.loadTemplate('passwordResetSuccess', {
                userName,
                resetDate,
            });

            return await this.sendEmail({
                to: email,
                subject: 'Your Jarayid Password Has Been Reset',
                html,
                text: `Hello ${userName}, 
                
Your password for your Jarayid account has been successfully reset on ${resetDate}.

You can now log in using your new password.

If you did not initiate this password reset, please contact our support team immediately.

Best regards,
Jarayid Team`,
            });
        } catch (error) {
            console.error('Error sending password reset success email:', error);
            throw error;
        }
    }

    /**
     * Verify email transporter configuration
     * @returns {Promise<boolean>} - True if configuration is valid
     */
    async verifyConnection() {
        try {
            await this.transporter.verify();
            // console.log('Email transporter is ready to send messages');
            return true;
        } catch (error) {
            console.error('Email transporter verification failed:', error);
            return false;
        }
    }
}

export default new EmailService();
