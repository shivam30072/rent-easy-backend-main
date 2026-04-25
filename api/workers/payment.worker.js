import paymentQueue from './payment.queue.js'
import { rentPaymentModel } from '../resources/RentPayment/RentPayment.Schema.js'
import { generateReceiptPDF } from '../helper/pdfGenerator.js'
import { uploadBufferToS3 } from '../helper/s3.js'
import { sendEmail } from '../helper/email.js'

paymentQueue.process('generate-receipt', async (job) => {
  const { paymentId } = job.data

  const payment = await rentPaymentModel.findById(paymentId)
    .populate('userId')
    .populate('ownerId')
    .lean()

  if (!payment) return

  // PDF generation
  if (process.env.ENABLE_RECEIPT_PDF === 'true') {
    const { buffer } = await generateReceiptPDF(payment)
    const { url } = await uploadBufferToS3(buffer, `receipts/${payment.transactionNumber}.pdf`, 'application/pdf')
    await rentPaymentModel.findByIdAndUpdate(paymentId, { receiptUrl: url })
    payment.receiptUrl = url
  }

  // Email sending
  if (process.env.ENABLE_EMAIL === 'true') {
    const tenantEmail = payment.userId?.email
    const ownerEmail = payment.ownerId?.userId?.email
    const recipients = [tenantEmail, ownerEmail].filter(Boolean)
    if (recipients.length > 0) {
      await sendEmail({
        to: recipients,
        subject: 'Rent Payment Receipt',
        text: 'Please find your payment receipt attached.',
        attachments: payment.receiptUrl ? [{ url: payment.receiptUrl, filename: `receipt-${payment.transactionNumber}.pdf` }] : [],
      })
    }
  }
})

paymentQueue.on('failed', (job, err) => {
  console.error(`[payment.worker] job ${job?.id} failed:`, err.message)
})
