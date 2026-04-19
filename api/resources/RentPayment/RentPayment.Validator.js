import { mongoose } from '../../helper/index.js'
const { isValidObjectId } = mongoose
const ENABLE_VALIDATION = process.env.ENABLE_VALIDATION === 'true'

const validateCreatePayment = (req, res, next) => {
  if (!ENABLE_VALIDATION) return next()
  const {
    agreementId,
    userId,
    ownerId,
    paymentDate,
    dueDate,
    amountPaid,
    paymentMode,
    transactionNumber
  } = req.body

  if (!agreementId) return res.status(400).json({ message: 'agreementId is required' })
  if (!userId) return res.status(400).json({ message: 'userId is required' })
  if (!ownerId) return res.status(400).json({ message: 'ownerId is required' })
  if (!paymentDate) return res.status(400).json({ message: 'paymentDate is required' })
  if (!dueDate) return res.status(400).json({ message: 'dueDate is required' })
  if (amountPaid === undefined) return res.status(400).json({ message: 'amountPaid is required' })
  if (!paymentMode) return res.status(400).json({ message: 'paymentMode is required' })
  if (!transactionNumber) return res.status(400).json({ message: 'transactionNumber is required' })

  // basic ObjectId validation
  if (![agreementId, userId, ownerId].every(id => isValidObjectId(id))) {
    return res.status(400).json({ message: 'Invalid object id in payload' })
  }

  next()
}

const RentPaymentValidator = {
  validateCreatePayment
}

export default RentPaymentValidator