/*
 * Nodemailer Plugin - Email Service
 * Handles OTP email delivery
 */
import fp from 'fastify-plugin';
import nodemailer from 'nodemailer';

// HTML template for OTP emails
function buildOtpEmailTemplate(code) {
  return `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>Hello 👋</h2>
      <p>Your OTP code is:</p>
      <div style="font-size: 28px; font-weight: bold; letter-spacing: 4px; margin: 20px 0;">
        ${code}
      </div>
      <p>This code expires in 5 minutes.</p>
      <p>If you didn't request this, you can ignore this email.</p>
      <p style="color: #888;">&copy; 2025 BEEPONG</p>
    </div>
  `;
}

async function nodemailerPlugin(fastify) {
    const gmailUser = process.env.GMAIL_USER;
    const gmailPassword = process.env.GMAIL_APP_PASS;
    
    if (!gmailUser || !gmailPassword) {
        throw new Error('Missing Gmail credentials in environment');
    }
    
    const mailTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: gmailUser,
            pass: gmailPassword
        }
    });

    fastify.decorate('sendMail', async (otpCode, recipientEmail) => {
        const emailConfig = {
            from: `${process.env.APP_NAME} <${process.env.APP_EMAIL}>`,
            to: recipientEmail,
            subject: "Your OTP code",
            html: buildOtpEmailTemplate(otpCode),
        };
        
        await mailTransporter.sendMail(emailConfig)
            .then((result) => {
                console.log("info: ", result);
                return result;
            })
            .catch(console.error);
    });
}

export default fp(nodemailerPlugin);
