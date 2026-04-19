import jwt from 'jsonwebtoken'
import nodemailer from 'nodemailer'

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret'

export const generateResetToken = (userId) => {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '10m' })
}

export const sendResetEmail = async (email, token) => {
  const link = `${process.env.FRONTEND_RESET_URL}reset-password?token=${token}`
  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: process.env.EMAIL_ID,
      pass: process.env.EMAIL_PASS
    }
  })

  await transporter.sendMail({
    from: process.env.EMAIL_ID,
    to: email,
subject: '🔐 RentEasy Password Reset Request',
html: `
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif max-width: 500px margin: auto background-color: #f9fafb padding: 30px border-radius: 12px border: 1px solid #e5e7eb box-shadow: 0 4px 12px rgba(0,0,0,0.05)">
    <div style="text-align: center">
      <h2 style="color: #111827 margin-bottom: 0.5rem">Reset Your Password</h2>
      <p style="color: #6b7280 font-size: 14px margin-bottom: 2rem">You requested to reset your password for your RentEasy account.</p>
    </div>

    <div style="text-align: center">
      <a href="${link}" style="display: inline-block background-color: #2563eb color: #ffffff padding: 12px 24px font-size: 16px border-radius: 8px text-decoration: none transition: background-color 0.3s">
        🔑 Reset Password
      </a>
    </div>

    <p style="margin-top: 2rem font-size: 14px color: #374151 line-height: 1.6">
      If you didn’t request this, you can safely ignore this email. This password reset link will expire in 30 minutes.
    </p>

    <div style="margin-top: 2rem border-top: 1px solid #e5e7eb padding-top: 1rem font-size: 13px color: #9ca3af text-align: center">
      Need help? Contact us at <a href="mailto:support@renteasy.com" style="color: #2563eb">support@renteasy.com</a><br>
      © ${new Date().getFullYear()} RentEasy, All rights reserved.
    </div>
  </div>
`

  })
}
