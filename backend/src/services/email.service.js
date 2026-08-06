import nodemailer from 'nodemailer';

const SMTP_PORT = parseInt(process.env.SMTP_PORT, 10) || 587;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendPasswordResetEmail = async (email, otp) => {
  const mailOptions = {
    from: process.env.FROM_EMAIL,
    to: email,
    subject: 'Nirikshan AI - Your Password Reset OTP Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #273449; border-radius: 12px; background-color: #070B14; color: #cbd5e1;">
        <h2 style="color: #00B8D9; margin-top: 0;">Password Reset OTP</h2>
        <p style="font-size: 15px; color: #f8fafc;">Hello,</p>
        <p style="font-size: 14px; line-height: 1.6;">You requested a password reset for your Nirikshan AI account. Please use the verification code below to set a new password:</p>
        <div style="text-align: center; margin: 24px 0;">
          <div style="display: inline-block; padding: 14px 28px; background-color: #111827; border: 2px dashed #00B8D9; border-radius: 8px; font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #00B8D9;">
            ${otp}
          </div>
        </div>
        <p style="color: #94a3b8; font-size: 13px;">This verification code expires in <strong>15 minutes</strong>.</p>
        <hr style="border: 0; height: 1px; background: #273449; margin: 20px 0;" />
        <p style="color: #64748b; font-size: 12px; margin-bottom: 0;">If you did not request a password reset, please ignore this message or contact your administrator.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Failed to send password reset email:', error.message);
  }
};
