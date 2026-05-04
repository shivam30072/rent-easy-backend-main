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

const validateLeaveNoticeBody = (req, res, next) => {
  const { intendedExitDate } = req.body
  if (!intendedExitDate) return res.status(400).json({ message: 'intendedExitDate is required' })
  const exit = new Date(intendedExitDate)
  if (isNaN(exit.getTime())) return res.status(400).json({ message: 'intendedExitDate is not a valid date' })
  if (exit.getTime() <= Date.now()) return res.status(400).json({ message: 'intendedExitDate must be in the future' })
  next()
}

const validateDamagesBody = (req, res, next) => {
  const { damages } = req.body
  if (!Array.isArray(damages) || damages.length === 0) return res.status(400).json({ message: 'damages must be a non-empty array' })
  for (const d of damages) {
    if (!d.description || typeof d.description !== 'string') return res.status(400).json({ message: 'each damage requires a description' })
    if (typeof d.amount !== 'number' || d.amount < 0) return res.status(400).json({ message: 'each damage requires a non-negative amount' })
  }
  next()
}

const RentalAgreement = {
  validateCreateAgreement,
  validateIdInBody,
  validateSendPdf,
  validateLeaveNoticeBody,
  validateDamagesBody
}

export default RentalAgreement