import fs from 'fs-extra'
import path from 'path'
import Handlebars from 'handlebars'
import puppeteer from 'puppeteer'

const TEMPLATE_DIR = process.env.PDF_TEMPLATE_DIR || path.resolve(process.cwd(), 'RentPayment/templates')
const RECEIPT_TEMPLATE = process.env.RECEIPT_TEMPLATE || 'receipt.html.hbs'
const TEMPLATE_PATH = path.join(TEMPLATE_DIR, RECEIPT_TEMPLATE)

// Puppeteer launch options configurable via env
const PUPPETEER_ARGS = (process.env.PUPPETEER_ARGS || '--no-sandbox,--disable-setuid-sandbox').split(',')
const PUPPETEER_HEADLESS = process.env.PUPPETEER_HEADLESS !== 'false' // default true

let compiledTemplate = null

const compileTemplate = async () => {
  if (compiledTemplate) return compiledTemplate
  const exists = await fs.pathExists(TEMPLATE_PATH)
  if (!exists) throw new Error(`PDF template not found at ${TEMPLATE_PATH}`)
  const tplSource = await fs.readFile(TEMPLATE_PATH, 'utf8')
  compiledTemplate = Handlebars.compile(tplSource)
  // register helpers
  Handlebars.registerHelper('formatDate', (d) => {
    if (!d) return ''
    const dt = new Date(d)
    return dt.toLocaleDateString()
  })
  Handlebars.registerHelper('formatCurrency', (v) => {
    if (v === undefined || v === null) return ''
    return Number(v).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 })
  })
  Handlebars.registerHelper('now', () => new Date().toISOString())
  return compiledTemplate
}

/**
 * generateReceiptPDF
 * @param {Object} payment - payment document (must have transactionNumber etc.)
 * @param {Object} tenant - tenant user doc { name, email, signatureUrl? }
 * @param {Object} owner - owner user doc { name, email, signatureUrl? }
 * @param {Object} room - room doc
 * @param {Object} property - property doc
 * @returns {Promise<{ buffer: Buffer, filename: string }>}
 */
export const generateReceiptPDF = async (payment = {}, tenant = {}, owner = {}, room = {}, property = {}) => {
  const tpl = await compileTemplate()

  const html = tpl({
    payment,
    tenant,
    owner,
    room,
    property,
    company: { logo: process.env.COMPANY_LOGO_URL || '' }
  })

  // Launch Puppeteer with configured args (safe defaults)
  const launchOpts = {
    args: PUPPETEER_ARGS,
    headless: PUPPETEER_HEADLESS,
    // allow specifying executable path by env (useful in Docker)
    ...(process.env.PUPPETEER_EXECUTABLE_PATH ? { executablePath: process.env.PUPPETEER_EXECUTABLE_PATH } : {})
  }

  const browser = await puppeteer.launch(launchOpts)
  try {
    const page = await browser.newPage()
    // optionally set a viewport
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 60000 })
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: process.env.PDF_MARGIN_TOP || '20mm',
        bottom: process.env.PDF_MARGIN_BOTTOM || '20mm',
        left: process.env.PDF_MARGIN_LEFT || '15mm',
        right: process.env.PDF_MARGIN_RIGHT || '15mm'
      }
    })
    const filename = `rent-receipt-${payment.transactionNumber || Date.now()}.pdf`
    return { buffer: pdfBuffer, filename }
  } finally {
    await browser.close().catch(() => {})
  }
}
