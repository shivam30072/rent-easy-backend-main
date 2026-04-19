import RentPaymentModel from './RentPayment.Model.js'
import { RENTPAYMENT_MESSAGES as MSG } from './RentPayment.Constant.js'

const createPayment = async (req, res, next) => {
  try {
    const payment = await RentPaymentModel.createRentPayment(req.body)

    return res.success(201, MSG.CREATED, payment)
  } catch (err) {
    const status = err.statusCode || (err.code === 11000 ? 409 : 500)
    const message = err.message || 'Server Error'
    res.status(status).json({ error: message })
  }
}

const getPaymentsByUser = async (req, res, next) => {
  try {
    const { userId } = req.params
    const options = { ...(req.query || {}), ...(req.body?.options || {}) }
    const payments = await RentPaymentModel.getPaymentsByUser(userId, options)

    return res.success(200, MSG.FETCHED, payments)
  } catch (err) {
    next(err)
  }
}

const getPaymentById = async (req, res, next) => {
  try {
    const payment = await RentPaymentModel.getPaymentById(req.params.id)
    if (!payment) return res.status(404).json({ message: MSG.NOT_FOUND })
  
    return res.success(200, MSG.FETCHED, payment)
  } catch (err) {
    next(err)
  }
}

const updatePayment = async (req, res, next) => {
  try {
    const updated = await RentPaymentModel.updatePayment(req.params.id, req.body)
    if (!updated) return res.status(404).json({ message: MSG.NOT_FOUND })

    return res.success(200, MSG.FETCHED, updated)
  } catch (err) {
    next(err)
  }
}

const deletePayment = async (req, res, next) => {
  try {
    const deleted = await RentPaymentModel.deletePayment(req.params.id)
    if (!deleted) return res.status(404).json({ message: MSG.NOT_FOUND })

    return res.success(200, MSG.DELETED, deleted)
  } catch (err) {
    next(err)
  }
}

const getPaymentBreakup = async (req, res, next) => {
  try {
    const paymentBreakup = await RentPaymentModel.getDueSummary(req)
    return res.success(200, MSG.FETCH_PAYMENT_BREAKUP, paymentBreakup)
  } catch (error) {
    next(error)
  }
}

const createOrder = async (req, res, next) => {
  try {
    const { agreementId, month, year } = req.body
    const userId = req.body.userId || req.user?._id
    if (!agreementId) return res.status(400).json({ message: 'agreementId is required' })
    if (!userId) return res.status(400).json({ message: 'userId is required' })

    const data = await RentPaymentModel.createPaymentOrder({ agreementId, userId, month, year })
    return res.success(201, MSG.ORDER_CREATED, data)
  } catch (err) {
    const status = err.statusCode || 500
    return res.status(status).json({ success: false, message: err.message })
  }
}

const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: 'Missing razorpay fields' })
    }
    const payment = await RentPaymentModel.verifyAndCapture({ razorpay_order_id, razorpay_payment_id, razorpay_signature })
    return res.success(200, MSG.VERIFIED, payment)
  } catch (err) {
    const status = err.statusCode || 500
    return res.status(status).json({ success: false, message: err.message })
  }
}

const razorpayWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature']
    const rawBody = req.body?.toString('utf8') || ''
    const result = await RentPaymentModel.handleRazorpayWebhook({ rawBody, signature })
    return res.status(200).json(result)
  } catch (err) {
    const status = err.statusCode || 500
    return res.status(status).json({ success: false, message: err.message })
  }
}

const confirmOffline = async (req, res, next) => {
  try {
    const { agreementId, month, year } = req.body
    const userId = req.body.userId || req.user?._id
    if (!agreementId) return res.status(400).json({ message: 'agreementId is required' })
    if (!userId) return res.status(400).json({ message: 'userId is required' })

    const payment = await RentPaymentModel.confirmOfflinePayment({ agreementId, userId, month, year })
    return res.success(201, 'Payment confirmed', payment)
  } catch (err) {
    const status = err.statusCode || 500
    return res.status(status).json({ success: false, message: err.message })
  }
}

const getPaymentsByOwner = async (req, res, next) => {
  try {
    const { ownerId } = req.params
    const options = { ...(req.query || {}) }
    const payments = await RentPaymentModel.getPaymentsByOwner(ownerId, options)
    return res.success(200, MSG.FETCHED, payments)
  } catch (err) {
    next(err)
  }
}

const RentPaymentController = {
  createPayment,
  getPaymentsByUser,
  getPaymentsByOwner,
  getPaymentById,
  updatePayment,
  deletePayment,
  getPaymentBreakup,
  createOrder,
  verifyPayment,
  razorpayWebhook,
  confirmOffline
}

export default RentPaymentController
