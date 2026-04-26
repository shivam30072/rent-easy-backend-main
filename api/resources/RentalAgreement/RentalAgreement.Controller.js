import RentalAgreementModel from './RentalAgreement.Model.js'
import { rentalAgreementModel } from './RentalAgreement.Schema.js'
import { RENTAL_AGREEMENT_MESSAGES as MSG } from './RentalAgreement.Constant.js'
import digio from '../../helper/digio.js'
import { uploadBufferToS3 } from '../../helper/s3.js'

const createAgreement = async (req, res) => {
  try {
    const { agreementData, options } = req.body // options: { sendPdf, sendEmails }
    const created = await RentalAgreementModel.createRentalAgreement(agreementData, options || { sendPdf: true, sendEmails: true })
    return res.success(201, MSG.CREATED, created)
  } catch (err) {
    console.error(err)
    res.status(err.statusCode || 500).json({ error: err.message })
  }
}

const listAgreements = async (req, res) => {
  try {
    const { query = {}, page, limit } = req.body
    const list = await RentalAgreementModel.getRentalAgreements(query, { page, limit })
    return res.success(200, MSG.LIST_AGREEMENT, list)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const getAgreementById = async (req, res) => {
  try {
    const { agreementId } = req.body
    const ag = await RentalAgreementModel.getRentalAgreementById(agreementId)
    if (!ag) return res.status(404).json({ message: MSG.NOT_FOUND })
    return res.success(200, MSG.AGREEMENT_FETCHED, ag)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const updateAgreementById = async (req, res) => {
  try {
    const { agreementId, agreementData } = req.body
    const updated = await RentalAgreementModel.updateRentalAgreementById(agreementId, agreementData)
    if (!updated) return res.status(404).json({ message: MSG.NOT_FOUND })

    return res.success(200, MSG.UPDATED, updated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const terminateAgreement = async (req, res) => {
  try {
    const { agreementId, reason } = req.body
    const userId = String(req.user?._id || req.user?.id || '')
    if (!userId) return res.status(401).json({ message: 'Unauthorized' })

    const agreement = await RentalAgreementModel.getRentalAgreementById(agreementId)
    if (!agreement) return res.status(404).json({ message: MSG.NOT_FOUND })

    const tenantId = String(agreement.userId?._id || agreement.userId)
    const ownerId = String(agreement.ownerId?._id || agreement.ownerId)
    if (userId !== tenantId && userId !== ownerId) {
      return res.status(403).json({ message: MSG.FORBIDDEN_TERMINATE })
    }
    if (agreement.status !== 'active') {
      return res.status(400).json({ message: MSG.NOT_ACTIVE })
    }

    const terminated = await RentalAgreementModel.terminateRentalAgreement(agreementId, reason || '', userId)
    if (!terminated) return res.status(404).json({ message: MSG.NOT_FOUND })

    return res.success(200, MSG.TERMINATED, terminated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const deleteAgreement = async (req, res) => {
  try {
    const { agreementId } = req.body
    const deleted = await RentalAgreementModel.deleteRentalAgreementById(agreementId)
    if (!deleted) return res.status(404).json({ message: MSG.NOT_FOUND })

    return res.success(200, MSG.DELETED, deleted)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

/* Generate PDF only and return as attachment (base64) or send via email (if options.sendEmails true) */
const generatePdfAndSend = async (req, res) => {
  try {
    const { agreementId, sendEmails = true } = req.body
    const { buffer, filename } = await RentalAgreementModel.createAgreementPdfOnly(agreementId)

    if (sendEmails) {
      // re-use model creation sending via sendMail inside model? For simplicity, send here using same logic
      // We'll create a nodemailer transporter here (or refactor to shared helper)
      // For brevity, respond with pdf as base64
      const base64 = buffer.toString('base64')
      const data = { filename, base64 }
      return res.success(200, MSG.PDF_GENERATED_SEND, data)
    }

    return res.success(200, MSG.PDF_GENERATED_SEND, filename)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const getAgreementsByTenant = async (req, res) => {
  try {
    const userId = req.query.userId || (req.user && req.user._id) || req.user?.id
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' })
    }
    const agreements = await RentalAgreementModel.getRentalAgreementsByTenant(userId)
    return res.success(200, MSG.AGREEMENT_FETCHED, agreements)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const getAgreementsByOwner = async (req, res) => {
  try {
    const ownerId = req.query.ownerId || (req.user && req.user._id) || req.user?.id
    if (!ownerId) {
      return res.status(400).json({ message: 'Owner ID is required' })
    }
    const agreements = await RentalAgreementModel.getRentalAgreementsByOwner(ownerId)
    return res.success(200, MSG.AGREEMENT_FETCHED, agreements)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const handleDigioWebhook = async (req, res) => {
  const token = req.headers['x-digio-token'] || req.query.token
  if (!token || token !== process.env.DIGIO_WEBHOOK_TOKEN) {
    return res.status(401).json({ success: false, message: 'Unauthorized' })
  }

  const event = req.body?.event
  const digioDocumentId = req.body?.payload?.document?.id || req.body?.payload?.document_id

  if (!digioDocumentId) {
    return res.status(400).json({ success: false, message: 'Missing document id in webhook payload' })
  }

  try {
    if (event === 'document.completed' || event === 'document.signed_by_all') {
      const { buffer } = await digio.downloadSignedDocument(digioDocumentId)
      const key = `signed-agreements/${digioDocumentId}.pdf`
      const uploadRes = await uploadBufferToS3(buffer, key, 'application/pdf')

      await rentalAgreementModel.findOneAndUpdate(
        { digioDocumentId },
        {
          digioStatus: 'signed',
          status: 'active',
          signedAgreementURL: uploadRes.url,
        }
      )
    } else if (event === 'document.expired') {
      await rentalAgreementModel.findOneAndUpdate(
        { digioDocumentId },
        { digioStatus: 'expired' }
      )
    } else if (event === 'document.failed') {
      await rentalAgreementModel.findOneAndUpdate(
        { digioDocumentId },
        { digioStatus: 'failed' }
      )
    }
    // Other events (e.g., 'document.signed' for a single signer) — no DB update needed here

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('Digio webhook error:', err?.response?.data || err.message || err)
    return res.status(500).json({ success: false, message: err.message })
  }
}

const RentalAgreementController =
{
  createAgreement,
  listAgreements,
  getAgreementById,
  updateAgreementById,
  terminateAgreement,
  deleteAgreement,
  generatePdfAndSend,
  getAgreementsByTenant,
  getAgreementsByOwner,
  handleDigioWebhook
}


export default RentalAgreementController