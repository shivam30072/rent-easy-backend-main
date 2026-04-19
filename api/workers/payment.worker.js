import paymentQueue from './payment.queue.js'
import { rentPaymentModel } from '../modules/RentPayment/rentPayment.Schema.js'
import { generateReceiptPDF } from '../utils/pdfGenerator.js'
import { uploadToS3 } from '../utils/s3.js'
import { sendEmail } from '../utils/email.js'

paymentQueue.process('generate-receipt', async (job) => {
  const { paymentId, ownerId, userId } = job.data

  const payment = await rentPaymentModel.findById(paymentId)
    .populate('userId')
    .populate('ownerId')
    .lean()

  if (!payment) return

  // PDF Generation
  if (process.env.ENABLE_RECEIPT_PDF === 'true') {
    const pdfBuffer = await generateReceiptPDF(payment)
    const s3Url = await uploadToS3(pdfBuffer, `receipts/${payment.transactionNumber}.pdf`)
    await rentPaymentModel.findByIdAndUpdate(paymentId, { receiptUrl: s3Url })
  }

  // Email sending
  if (process.env.ENABLE_EMAIL === 'true') {
    await sendEmail({
      to: [payment.userId.email, payment.ownerId.userId.email],
      subject: 'Rent Payment Receipt',
      body: 'Please find your payment receipt attached.',
      attachments: payment.receiptUrl ? [{ url: payment.receiptUrl }] : []
    })
  }
})
