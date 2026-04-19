// utils/email.js
import nodemailer from 'nodemailer'
import fetch from 'node-fetch' // for fetching attachments by URL if needed
import { Readable } from 'stream'

const SMTP_HOST = process.env.SMTP_HOST
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10)
const SMTP_SECURE = process.env.SMTP_SECURE === 'true'
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASS = process.env.SMTP_PASS
const MAIL_FROM = process.env.MAIL_FROM || SMTP_USER
const EMAIL_RETRY = parseInt(process.env.EMAIL_RETRY || '2', 10)
const EMAIL_RETRY_DELAY_MS = parseInt(process.env.EMAIL_RETRY_DELAY_MS || '1000', 10)

if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
  console.warn('email.js: SMTP configuration missing. Emails will fail unless configured in env.')
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
  // increase timeouts for attachments
  pool: true,
  maxConnections: 5,
  maxMessages: 100
})

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * normalizeAttachment - convert generic attachment descriptors to nodemailer format
 * supported forms:
 *  - { filename, content: Buffer }
 *  - { filename, path: '/tmp/file.pdf' }
 *  - { filename, url: 'https://...' }
 */
const normalizeAttachment = async (att) => {
  if (!att) return null
  // Buffer
  if (att.content && Buffer.isBuffer(att.content)) {
    return { filename: att.filename || 'attachment', content: att.content }
  }
  // stream
  if (att.stream) {
    // convert stream to buffer-friendly readable
    return { filename: att.filename || 'attachment', content: Readable.from(att.stream) }
  }
  // local path
  if (att.path) {
    return { filename: att.filename || att.path.split('/').pop(), path: att.path }
  }
  // url - fetch
  if (att.url) {
    const res = await fetch(att.url)
    if (!res.ok) throw new Error(`Failed to fetch attachment URL: ${res.status}`)
    const buffer = await res.buffer()
    return { filename: att.filename || (att.url.split('/').pop()), content: buffer }
  }
  // base64
  if (att.base64) {
    const buffer = Buffer.from(att.base64, 'base64')
    return { filename: att.filename || 'attachment', content: buffer }
  }
  return null
}

/**
 * sendEmail
 * @param {Object} opts
 *  - to: string | string[]
 *  - subject: string
 *  - text: string
 *  - html: string (optional)
 *  - attachments: [{ filename, content|path|url|base64 }]
 */
export const sendEmail = async (opts = {}) => {
  const { to, subject, text, html, attachments = [] } = opts
  if (!to) throw new Error('sendEmail: "to" is required')

  const normAttachments = []
  for (const a of attachments || []) {
    const na = await normalizeAttachment(a).catch((err) => {
      console.warn('sendEmail: attachment normalization failed', err)
      return null
    })
    if (na) normAttachments.push(na)
  }

  const mailOptions = {
    from: MAIL_FROM,
    to: Array.isArray(to) ? to.join(',') : to,
    subject: subject || '(no subject)',
    text: text || '',
    html,
    attachments: normAttachments
  }

  // simple retry loop
  let lastError = null
  for (let attempt = 0; attempt <= EMAIL_RETRY; attempt++) {
    try {
      const info = await transporter.sendMail(mailOptions)
      return info
    } catch (err) {
      lastError = err
      console.warn(`sendEmail attempt ${attempt} failed:`, err && err.message)
      if (attempt < EMAIL_RETRY) {
        await sleep(EMAIL_RETRY_DELAY_MS * (attempt + 1))
        continue
      }
    }
  }
  throw lastError
}
