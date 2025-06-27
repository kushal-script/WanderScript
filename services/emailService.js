// services/emailService.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

/**
 * Sends an OTP email to a user.
 * @param {string} toEmail - Recipient's email address.
 * @param {string} otp - The OTP to send.
 */
exports.sendOtpEmail = async (toEmail, otp) => {
    await transporter.sendMail({
        from: process.env.EMAIL_USER, // Use environment variable for consistency
        to: toEmail,
        subject: 'Your WanderScript OTP',
        text: `Your OTP is ${otp}. It is valid for 5 minutes. You can request for another otp after a minute.`,
    });
};

/**
 * Sends a general contact email.
 * @param {string} fromEmail - Sender's email address.
 * @param {string} toEmail - Recipient's email address.
 * @param {string} subject - Email subject.
 * @param {string} body - Email body.
 */
exports.sendContactMail = async (fromEmail, toEmail, subject, body) => {
    await transporter.sendMail({
        from: fromEmail,
        to: toEmail,
        subject: subject,
        text: body
    });
};