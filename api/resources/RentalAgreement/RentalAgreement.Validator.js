import { mongoose } from '../../helper/index.js'
const { isValidObjectId } = mongoose

const ENABLE_VALIDATION = process.env.ENABLE_VALIDATION === 'true'

const validateCreateAgreement = (req, res, next) => {
  if (!ENABLE_VALIDATION) return next()
  const data = req.body.agreementData || {}
  const { roomId, userId, ownerId, agreementStartDate, agreementEndDate, rentAmount, securityDeposit } = data

  if (!roomId) return res.status(400).json({ message: 'roomId is required' })
  if (!userId) return res.status(400).json({ message: 'userId is required' })
  if (!ownerId) return res.status(400).json({ message: 'ownerId is required' })
  if (!agreementStartDate) return res.status(400).json({ message: 'agreementStartDate is required' })
  if (!agreementEndDate) return res.status(400).json({ message: 'agreementEndDate is required' })
  if (new Date(agreementEndDate) <= new Date(agreementStartDate)) return res.status(400).json({ message: 'agreementEndDate must be after agreementStartDate' })
  if (rentAmount === undefined) return res.status(400).json({ message: 'rentAmount is required' })
  if (securityDeposit === undefined) return res.status(400).json({ message: 'securityDeposit is required' })

  // optional ObjectId sanity
  if (![roomId, userId, ownerId].every(id => isValidObjectId(id))) return res.status(400).json({ message: 'Invalid object id in payload' })

  next()
}

const validateIdInBody = (req, res, next) => {
  if (!ENABLE_VALIDATION) return next()
  if (!req.body.agreementId) return res.status(400).json({ message: 'agreementId is required' })
  next()
}

const validateSendPdf = (req, res, next) => {
  if (!ENABLE_VALIDATION) return next()
  const { agreementId } = req.body
  if (!agreementId) return res.status(400).json({ message: 'agreementId is required' })
  next()
}

const RentalAgreement = {
  validateCreateAgreement,
  validateIdInBody,
  validateSendPdf
}

export default RentalAgreement