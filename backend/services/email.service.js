import transporter from '../config/email.js';

export const sendResetPasswordEmail = async (email, resetUrl) => {
    const message = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Password Reset Request',
        html: `
            <h2>Password Reset</h2>
            <p>You requested a password reset. Click the link below:</p>
            <a href="${resetUrl}" style="padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">
                Reset Password
            </a>
            <p>Or copy this link: ${resetUrl}</p>
            <p><strong>This link expires in 1 hour.</strong></p>
            <p>If you didn't request this, ignore this email.</p>
        `,
    };

    return transporter.sendMail(message);
};