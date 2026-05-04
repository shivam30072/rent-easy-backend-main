import { rentalAgreementModel } from './RentalAgreement.Schema.js'
import { convertToObjectId, PDFDocument, streamBuffers, nodemailer, AppError } from '../../helper/index.js'
import { roomModel } from '../Room/Room.Schema.js'
import { propertyModel } from '../Property/Property.Schema.js'
import { ownerModel } from '../Owner/Owner.Schema.js'
import { documentModel } from '../Document/Document.Schema.js'
import digio from '../../helper/digio.js'
import { uploadBufferToS3 } from '../../helper/s3.js'
import { sendPushNotification } from '../../helper/pushNotification.js'
import { NotificationModel } from '../Notification/Notification.Model.js'
import { agreementRequestModel } from '../AgreementRequest/AgreementRequest.Schema.js'
import { createReputationSignal } from '../../services/reputation.service.js'
import { SIGNAL_TYPES, ROLES } from '../ReputationSignal/ReputationSignal.Constant.js'
import { SIGNAL_WEIGHTS } from '../../config/reputation.weights.js'
import { computeSettlement } from '../../services/settlement.service.js'
import { rentPaymentModel } from '../RentPayment/RentPayment.Schema.js'
import { disputeModel } from '../Dispute/Dispute.Schema.js'
import { reputationSignalModel } from '../ReputationSignal/ReputationSignal.Schema.js'
import { DISPUTE_STATUS } from '../Dispute/Dispute.Constant.js'
import { SIGNAL_STATUS } from '../ReputationSignal/ReputationSignal.Constant.js'


/**
 * Helper: generate PDF buffer from agreement data
 * Returns: { buffer, filename }
 */
const generateAgreementPdfBuffer = async (agreement, tenant = {}, owner = {}, room = {}, property = {}) => {
  const doc = new PDFDocument({ size: 'A4', margin: 50 })
  const bufferStream = new streamBuffers.WritableStreamBuffer({
    initialSize: (100 * 1024),   // start at 100kB
    incrementAmount: (10 * 1024) // grow by 10kB
  })

  doc.pipe(bufferStream)

  // Header
  doc.fontSize(18).text('Rental Agreement', { align: 'center' }).moveDown(1)

  // Parties
  doc.fontSize(12).text(`Owner: ${owner.name || owner.email || agreement.ownerId}`, { continued: false })
  doc.text(`Tenant: ${tenant.name || tenant.email || agreement.userId}`)
  doc.moveDown(0.5)

  // Property/Room
  doc.text(`Property: ${property.propertyName || ''}`)
  doc.text(`Room: ${room.roomNumber || ''} - ${room.roomType || ''}`)
  doc.moveDown(0.5)

  // Agreement dates & amounts
  doc.text(`Start Date: ${new Date(agreement.agreementStartDate).toLocaleDateString()}`)
  doc.text(`End Date: ${new Date(agreement.agreementEndDate).toLocaleDateString()}`)
  doc.text(`Rent Amount: ₹${agreement.rentAmount}`)
  doc.text(`Security Deposit: ₹${agreement.securityDeposit}`)
  doc.moveDown(1)

  // Terms (simple placeholder - replace with your own terms or use template engine)
  doc.fontSize(10).text('Terms & Conditions:', { underline: true })
  doc.moveDown(0.2)
  doc.text('1. Rent shall be payable monthly as per schedule.')
  doc.text('2. Tenant shall maintain the property in good condition.')
  doc.text('3. Security deposit will be refunded per agreement at the end of tenancy, subject to deductions for damages.')
  doc.text('4. Either party may terminate the agreement as per mutually agreed conditions.')
  doc.moveDown(2)

  // Signatures placeholders
  doc.text('Owner Signature: ____________________', { continued: true })
  doc.text('        Date: ____________')
  doc.moveDown(1)
  doc.text('Tenant Signature: ____________________', { continued: true })
  doc.text('        Date: ____________')

  doc.end()

  await new Promise((resolve) => bufferStream.on('finish', resolve))

  const buffer = bufferStream.getContents()
  const filename = `rental-agreement-${agreement._id.toString()}.pdf`
  return { buffer, filename }
}

/**
 * Helper: send mail with attachment to array of recipients
 * Expects SMTP config in env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM
 */
const sendMailWithAttachment = async ({ to = [], subject = '', text = '', attachments = [] }) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  })

  const mailOptions = {
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: Array.isArray(to) ? to.join(',') : to,
    subject,
    text,
    attachments
  }

  return transporter.sendMail(mailOptions)
}

/* Model Methods */

const createRentalAgreement = async (agreementData, opts = { sendPdf: true, sendEmails: true }) => {
    console.log("Aaya toh h yaha par: ")
    const room = await roomModel.findById(agreementData.roomId)
    if (!room) {
      throw new AppError('Room not found')
      // return res.status(404).json({ error: "Room not found" })
    }

    const isAlreadyExist = await rentalAgreementModel.find({ roomId: agreementData.roomId, status: agreementData.status })
    if(isAlreadyExist.length > 0)  throw new AppError('Agreement of this room already exist! ')

    // 2️⃣ Find active rental (where endDate is null)
    // const activeRental = room.rentalHistory.find(r => r.endDate === null)
    // if (!activeRental) {
    //   return res.status(400).json({ error: "No active tenant found for this room" })
    // }

  const property = await propertyModel.findById(room.propertyId)
  const owner = await ownerModel.findById(property.ownerId)
  const ownerUserId = owner.userId

  // Pull digital signatures from the Document collection (uploaded during KYC).
  // If a party hasn't uploaded one yet, we proceed without it — Digio eSign is authoritative.
  const ownerSignDoc = await documentModel.findOne({ userId: ownerUserId, docType: 'sign' })
  const tenantSignDoc = await documentModel.findOne({ userId: convertToObjectId(agreementData.userId), docType: 'sign' })

  // Compute security deposit from room rent × deposit months (owner-configurable, default 1)
  const depositMonths = room.securityDeposit?.months || 1
  agreementData.securityDeposit = room.rent * depositMonths

  agreementData.ownerId = ownerUserId
  agreementData.propertyId = property._id
  agreementData.digitalSignatures = {}
  if (ownerSignDoc?.url) agreementData.digitalSignatures.ownerSignatureURL = ownerSignDoc.url
  if (tenantSignDoc?.url) agreementData.digitalSignatures.userSignatureURL = tenantSignDoc.url
  // signedAgreementURL stays empty until Digio webhook delivers the final signed+stamped PDF

  const created = await rentalAgreementModel.create(agreementData)

  // Reputation signal: agreement signed promptly (within 7 days of accepting the AgreementRequest).
  // Only fires when the caller passed the originating _agreementRequestId.
  try {
    if (agreementData._agreementRequestId) {
      const ar = await agreementRequestModel.findById(agreementData._agreementRequestId).lean()
      if (ar?.updatedAt) {
        const respondedAt = new Date(ar.updatedAt).getTime()
        const signedAt = new Date(created.createdAt).getTime()
        const daysBetween = (signedAt - respondedAt) / (1000 * 60 * 60 * 24)
        if (daysBetween <= 7) {
          createReputationSignal({
            userId: created.ownerId,
            role: ROLES.OWNER,
            signalType: SIGNAL_TYPES.AGREEMENT_SIGNED_PROMPTLY,
            weightedValue: SIGNAL_WEIGHTS[SIGNAL_TYPES.AGREEMENT_SIGNED_PROMPTLY],
            sourceRef: { collection: 'RentalAgreement', id: created._id },
          }).catch(err => console.error('[reputation] signed-promptly signal failed:', err.message))
        }
      }
    }
  } catch (err) {
    console.error('[reputation] agreement-signed-promptly check failed:', err.message)
  }

  // Mark room as unavailable and add to rental history
  try {
    room.isAvailable = false
    const alreadyActive = room.rentalHistory?.some(h => h.endDate === null)
    if (!alreadyActive) {
      room.rentalHistory.push({
        tenantId: convertToObjectId(agreementData.userId),
        startDate: agreementData.agreementStartDate,
        rentAmount: agreementData.rentAmount,
        securityDeposit: agreementData.securityDeposit
      })
    }
    await room.save()
  } catch (err) {
    console.error('Room availability update error:', err.message)
  }

  // Auto-decline all other pending agreement requests from this tenant
  try {
    const tenantId = convertToObjectId(agreementData.userId)
    await agreementRequestModel.updateMany(
      { tenantId, status: 'pending', _id: { $ne: agreementData._agreementRequestId || null } },
      { $set: { status: 'declined' } }
    )
  } catch (err) {
    console.error('Auto-decline pending requests error:', err.message)
  }

  // Generate PDF buffer once — used for both S3 upload and Digio upload below
  let pdfBuffer, pdfFilename
  let agg
  try {
    agg = await rentalAgreementModel.findById(created._id)
      .populate('userId', 'name email phone')
      .populate('ownerId', 'name email phone')
      .lean()

    const result = await generateAgreementPdfBuffer(
      agg,
      agg.userId || {},
      agg.ownerId || {},
      room || {},
      property || {}
    )
    pdfBuffer = result.buffer
    pdfFilename = result.filename
  } catch (err) {
    console.error('PDF generation error', err?.message || err)
  }

  // Upload unsigned PDF to S3 so owner/tenant can download it immediately
  if (pdfBuffer) {
    try {
      const key = `unsigned-agreements/${created._id}.pdf`
      const { url } = await uploadBufferToS3(pdfBuffer, key, 'application/pdf')
      await rentalAgreementModel.findByIdAndUpdate(created._id, { unsignedAgreementURL: url })
    } catch (err) {
      console.error('Unsigned PDF S3 upload error', err?.message || err)
    }
  }

  // Notify tenant about the new agreement
  try {
    const tenantUserId = agreementData.userId
    const ownerName = agg?.ownerId?.name || 'Your landlord'
    const propName = property?.propertyName || 'a property'

    await NotificationModel.createNotification({
      userId: tenantUserId,
      type: 'agreement_request',
      message: `${ownerName} has created a rental agreement for ${propName}. Review and sign it.`,
      meta: { agreementId: created._id, propertyId: property?._id },
      triggeredAt: new Date()
    })

    await sendPushNotification(
      tenantUserId,
      'New Rental Agreement',
      `${ownerName} created a rental agreement for ${propName}`,
      { type: 'agreement_created', agreementId: String(created._id) }
    )
  } catch (err) {
    console.error('Tenant agreement notification error:', err.message)
  }

  // Skip Digio entirely if credentials not configured (dev/local without Digio account)
  if (!process.env.DIGIO_CLIENT_ID || !process.env.DIGIO_CLIENT_SECRET) {
    console.log('Digio credentials not configured — skipping eSign integration')
    return created
  }

  // Best-effort Digio upload — does not block agreement creation if it fails
  if (!pdfBuffer || !agg) {
    console.error('Skipping Digio upload: PDF buffer missing')
    await rentalAgreementModel.findByIdAndUpdate(created._id, { digioStatus: 'failed' })
    return created
  }

  try {
    const signers = []
    if (agg.ownerId?.email || agg.ownerId?.phone) {
      signers.push({
        identifier: agg.ownerId.email || agg.ownerId.phone,
        name: agg.ownerId.name || 'Owner',
        sign_type: 'aadhaar',
        reason: 'Rental agreement signing',
      })
    }
    if (agg.userId?.email || agg.userId?.phone) {
      signers.push({
        identifier: agg.userId.email || agg.userId.phone,
        name: agg.userId.name || 'Tenant',
        sign_type: 'aadhaar',
        reason: 'Rental agreement signing',
      })
    }

    if (signers.length === 0) {
      throw new Error('No valid signer identifiers (email or phone) found')
    }

    const { digioDocumentId } = await digio.uploadAgreementForSigning({
      pdfBuffer,
      fileName: pdfFilename,
      signers,
      stampPaperValue: 100,
      stampPaperState: 'KA',
      reason: 'Rental Agreement',
      expireInDays: 7,
    })

    await rentalAgreementModel.findByIdAndUpdate(created._id, {
      digioDocumentId,
      digioStatus: 'in_progress',
    })
  } catch (err) {
    console.error('Digio upload error for rental agreement', err?.response?.data || err.message || err)
    await rentalAgreementModel.findByIdAndUpdate(created._id, {
      digioStatus: 'failed',
    })
  }

  return created
}

const getRentalAgreements = async (filter = {}, options = {}) => {
  const q = { ...filter }
  const page = options.page > 0 ? parseInt(options.page) : 0
  const limit = options.limit > 0 ? parseInt(options.limit) : 0

  const cursor = rentalAgreementModel.find(q).sort({ createdAt: -1 }).lean()
  if (limit) cursor.skip(page * limit).limit(limit)
  return await cursor
}

const getRentalAgreementById = async (id) => {
  return await rentalAgreementModel.findById(convertToObjectId(id)).lean()
}

const updateRentalAgreementById = async (agreementId, updateData) => {
  // if dates or rent change, you can add business checks here
  return await rentalAgreementModel.findByIdAndUpdate(convertToObjectId(agreementId), { $set: updateData }, { new: true })
}

const terminateRentalAgreement = async (agreementId, reason = '', initiatedByUserId = null) => {
  const before = await rentalAgreementModel.findById(convertToObjectId(agreementId)).lean()
  if (!before) return null
  if (before.status !== 'active') return null

  const initiator = initiatedByUserId ? String(initiatedByUserId) : null
  const tenantId = String(before.userId)
  const ownerId = String(before.ownerId)
  const ownerInitiated = initiator === ownerId
  const tenantInitiated = initiator === tenantId

  // Aggregate unpaid rent
  const unpaidPayments = await rentPaymentModel.find({
    agreementId: before._id,
    status: { $in: ['pending', 'late'] },
  }).lean()
  const unpaidRentTotal = unpaidPayments.reduce(
    (sum, p) => sum + (p.amountPaid || 0) + (p.penaltyAmount || 0),
    0
  )

  // Compute settlement (math only)
  const calc = computeSettlement({
    agreement: before,
    unpaidRentTotal,
    damageTotal: 0,
    now: new Date(),
    ownerInitiated,
  })

  // Avoid double-charging for the exit month's rent: if a RentPayment row
  // already exists for the exit month (paid OR unpaid), the prorated rent is
  // already covered — by the RentPayment system if paid, or by unpaidRentTotal
  // above if pending/late. Drop proratedFinalRent in that case.
  const exitDateForCheck = before.leaveNotice?.intendedExitDate || new Date()
  const exitMonth = new Date(exitDateForCheck).getMonth() + 1
  const exitYear = new Date(exitDateForCheck).getFullYear()
  const existingExitMonthPayment = await rentPaymentModel.findOne({
    agreementId: before._id,
    month: exitMonth,
    year: exitYear,
  }).lean()
  const proratedFinalRent = existingExitMonthPayment ? 0 : calc.proratedFinalRent
  const netRefund = before.securityDeposit - calc.noticePenalty - unpaidRentTotal - proratedFinalRent

  const ownerActionDeadline = new Date()
  ownerActionDeadline.setDate(ownerActionDeadline.getDate() + 7)

  const settlement = {
    securityDeposit: before.securityDeposit,
    noticePenalty: calc.noticePenalty,
    unpaidRentTotal,
    proratedFinalRent,
    damageDeductions: [],
    netRefund,
    status: 'pending_owner',
    ownerActionDeadline,
    paidAt: null,
    disputeId: null,
  }

  const updated = await rentalAgreementModel.findOneAndUpdate(
    { _id: convertToObjectId(agreementId), status: 'active' },
    {
      $set: {
        isActive: false,
        status: 'terminated',
        'meta.terminationReason': reason,
        'meta.terminatedBy': initiatedByUserId || 'system',
        settlement,
      },
    },
    { new: true }
  )

  if (!updated) return updated

  // Mark unpaid RentPayments as settled-via-deposit (metadata flag)
  if (unpaidPayments.length > 0) {
    await rentPaymentModel.updateMany(
      { _id: { $in: unpaidPayments.map(p => p._id) } },
      { $set: { 'metadata.settledViaDeposit': true } }
    )
  }

  // Release the room: mark available again and close the open rentalHistory entry.
  try {
    const room = await roomModel.findById(before.roomId)
    if (room) {
      room.isAvailable = true
      const tenantIdStr = String(before.userId)
      const openEntry = room.rentalHistory?.find(
        h => h.endDate === null && String(h.tenantId) === tenantIdStr
      )
      if (openEntry) openEntry.endDate = new Date()
      await room.save()
    }
  } catch (err) {
    console.error('Room release on termination failed:', err.message)
  }

  // Reputation signals — owner kick-out fires immediately
  if (ownerInitiated) {
    createReputationSignal({
      userId: before.ownerId,
      role: ROLES.OWNER,
      signalType: SIGNAL_TYPES.AGREEMENT_TERMINATED_BY_OWNER,
      weightedValue: SIGNAL_WEIGHTS[SIGNAL_TYPES.AGREEMENT_TERMINATED_BY_OWNER],
      rawValue: { reason: reason || null },
      sourceRef: { collection: 'RentalAgreement', id: before._id },
      pushImmediate: true,
    }).catch(err => console.error('[reputation] terminated-by-owner signal failed:', err.message))
  }
  // Tenant-side AGREEMENT_TERMINATED_EARLY is now deferred to settlement resolution.

  // Notify both parties
  await NotificationModel.createNotification({
    userId: before.userId,
    type: 'settlement_created',
    message: `Your tenancy has ended. Net refund: ₹${calc.netRefund.toFixed(2)}.`,
    meta: { agreementId: before._id, netRefund: calc.netRefund },
    triggeredAt: new Date(),
  })
  await NotificationModel.createNotification({
    userId: before.ownerId,
    type: 'settlement_created',
    message: `Tenancy ended. Mark refund paid within 7 days to avoid a reputation penalty.`,
    meta: { agreementId: before._id, netRefund: calc.netRefund, deadline: ownerActionDeadline },
    triggeredAt: new Date(),
  })

  return updated
}

const deleteRentalAgreementById = async (agreementId) => {
  return await rentalAgreementModel.findByIdAndDelete(convertToObjectId(agreementId))
}

const submitLeaveNotice = async (agreementId, tenantUserId, { intendedExitDate, reason = '' }) => {
  const agreement = await rentalAgreementModel.findById(convertToObjectId(agreementId))
  if (!agreement) return { error: 'NOT_FOUND' }
  if (String(agreement.userId) !== String(tenantUserId)) return { error: 'NOT_TENANT' }
  if (agreement.status !== 'active') return { error: 'NOT_ACTIVE' }
  if (agreement.leaveNotice) return { error: 'NOTICE_EXISTS' }

  agreement.leaveNotice = {
    submittedAt: new Date(),
    intendedExitDate: new Date(intendedExitDate),
    reason: (reason || '').slice(0, 500),
  }
  await agreement.save({ validateModifiedOnly: true })

  // Notify owner
  await NotificationModel.createNotification({
    userId: agreement.ownerId,
    type: 'leave_notice_submitted',
    message: `Your tenant has submitted a leave notice. Intended exit: ${new Date(intendedExitDate).toDateString()}.`,
    meta: { agreementId: agreement._id, intendedExitDate },
    triggeredAt: new Date(),
  })

  return { agreement }
}

/* Utility: create PDF and return buffer (no emailing) */
const createAgreementPdfOnly = async (agreementId) => {
  const agreement = await rentalAgreementModel.findById(convertToObjectId(agreementId))
    .populate('userId', 'name email')
    .populate('ownerId', 'name email')
    .lean()
  if (!agreement) throw new Error('Agreement not found')
  // get room/property minimal details
  let room = {}, property = {}
  try {
    const { roomModel } = await import('../Room/Room.Schema.js')
    room = await roomModel.findById(agreement.roomId).lean().catch(()=>({}))
    if (room?.propertyId) {
      const { propertyModel } = await import('../Property/Property.Schema.js')
      property = await propertyModel.findById(room.propertyId).lean().catch(()=>({}))
    }
  } catch (e) {}
  return generateAgreementPdfBuffer(agreement, agreement.userId || {}, agreement.ownerId || {}, room || {}, property || {})
}

const getRentalAgreementsByTenant = async (userId) => {
  return await rentalAgreementModel.find({ userId: convertToObjectId(userId) })
    .sort({ createdAt: -1 })
    .populate({
      path: 'roomId',
      populate: { path: 'propertyId' }
    })
    .lean()
}

const getRentalAgreementsByOwner = async (ownerId) => {
  return await rentalAgreementModel
    .find({ ownerId: convertToObjectId(ownerId) })
    .sort({ createdAt: -1 })
    .populate('userId', 'name email phone')
    .populate({
      path: 'roomId',
      select: 'roomType roomNumber rent securityDeposit',
      populate: { path: 'propertyId', select: 'propertyName' }
    })
    .lean()
}

const addDamagesToSettlement = async (agreementId, ownerUserId, damages) => {
  const agreement = await rentalAgreementModel.findById(convertToObjectId(agreementId))
  if (!agreement) return { error: 'NOT_FOUND' }
  if (String(agreement.ownerId) !== String(ownerUserId)) return { error: 'NOT_OWNER' }
  if (!agreement.settlement) return { error: 'NO_SETTLEMENT' }
  if (agreement.settlement.status !== 'pending_owner') return { error: 'SETTLEMENT_NOT_PENDING' }
  if (new Date() > new Date(agreement.settlement.ownerActionDeadline)) return { error: 'DEADLINE_PASSED' }

  const damageTotal = damages.reduce((s, d) => s + d.amount, 0)
  const newNetRefund =
    agreement.settlement.securityDeposit -
    agreement.settlement.noticePenalty -
    agreement.settlement.unpaidRentTotal -
    agreement.settlement.proratedFinalRent -
    damageTotal

  agreement.settlement.damageDeductions = damages
  agreement.settlement.netRefund = newNetRefund
  await agreement.save({ validateModifiedOnly: true })

  await NotificationModel.createNotification({
    userId: agreement.userId,
    type: 'damages_added',
    message: `Your owner has added ₹${damageTotal.toFixed(2)} in damage deductions. Net refund is now ₹${newNetRefund.toFixed(2)}. You may dispute if you disagree.`,
    meta: { agreementId: agreement._id, damageTotal, netRefund: newNetRefund },
    triggeredAt: new Date(),
  })

  return { agreement }
}

const markRefundPaid = async (agreementId, actingUserId) => {
  const agreement = await rentalAgreementModel.findById(convertToObjectId(agreementId))
  if (!agreement) return { error: 'NOT_FOUND' }
  if (!agreement.settlement) return { error: 'NO_SETTLEMENT' }
  if (agreement.settlement.status !== 'pending_owner') return { error: 'ALREADY_RESOLVED' }

  const ownerId = String(agreement.ownerId)
  const tenantId = String(agreement.userId)
  const acting = String(actingUserId)
  const netRefund = agreement.settlement.netRefund
  const expectedActor = netRefund >= 0 ? ownerId : tenantId
  if (acting !== expectedActor) return { error: 'WRONG_ACTOR' }

  agreement.settlement.status = 'paid'
  agreement.settlement.paidAt = new Date()
  await agreement.save({ validateModifiedOnly: true })

  const withinWindow = new Date() <= new Date(agreement.settlement.ownerActionDeadline)

  // Owner-side: SETTLEMENT_HONORED only if owner paid within window AND there was actually money to refund
  if (acting === ownerId && withinWindow && netRefund > 0) {
    createReputationSignal({
      userId: agreement.ownerId,
      role: ROLES.OWNER,
      signalType: SIGNAL_TYPES.SETTLEMENT_HONORED,
      weightedValue: SIGNAL_WEIGHTS[SIGNAL_TYPES.SETTLEMENT_HONORED],
      sourceRef: { collection: 'RentalAgreement', id: agreement._id },
      pushImmediate: true,
    }).catch(err => console.error('[reputation] settlement-honored failed:', err.message))
  }

  // Tenant-side: deferred AGREEMENT_TERMINATED_EARLY OR PROPER_NOTICE_HONORED
  if (agreement.settlement.noticePenalty > 0) {
    createReputationSignal({
      userId: agreement.userId,
      role: ROLES.TENANT,
      signalType: SIGNAL_TYPES.AGREEMENT_TERMINATED_EARLY,
      weightedValue: SIGNAL_WEIGHTS[SIGNAL_TYPES.AGREEMENT_TERMINATED_EARLY],
      sourceRef: { collection: 'RentalAgreement', id: agreement._id },
      pushImmediate: true,
    }).catch(err => console.error('[reputation] terminated-early failed:', err.message))
  } else if (agreement.leaveNotice) {
    const daysOfNotice = Math.floor(
      (new Date(agreement.leaveNotice.intendedExitDate) - new Date(agreement.leaveNotice.submittedAt)) / 86400000
    )
    const depositMonths = Math.max(1, Math.round(agreement.securityDeposit / agreement.rentAmount))
    const requiredDays = depositMonths * 30
    if (daysOfNotice >= requiredDays) {
      createReputationSignal({
        userId: agreement.userId,
        role: ROLES.TENANT,
        signalType: SIGNAL_TYPES.PROPER_NOTICE_HONORED,
        weightedValue: SIGNAL_WEIGHTS[SIGNAL_TYPES.PROPER_NOTICE_HONORED],
        sourceRef: { collection: 'RentalAgreement', id: agreement._id },
        pushImmediate: true,
      }).catch(err => console.error('[reputation] proper-notice-honored failed:', err.message))
    }
  }

  // Notify the other party
  const otherParty = acting === ownerId ? agreement.userId : agreement.ownerId
  await NotificationModel.createNotification({
    userId: otherParty,
    type: 'refund_paid',
    message: 'Settlement marked paid. Tenancy is now fully closed.',
    meta: { agreementId: agreement._id },
    triggeredAt: new Date(),
  })

  return { agreement }
}

const raiseSettlementDispute = async (agreementId, tenantUserId, reason) => {
  const agreement = await rentalAgreementModel.findById(convertToObjectId(agreementId))
  if (!agreement) return { error: 'NOT_FOUND' }
  if (String(agreement.userId) !== String(tenantUserId)) return { error: 'NOT_TENANT' }
  if (!agreement.settlement) return { error: 'NO_SETTLEMENT' }
  if (agreement.settlement.status !== 'pending_owner') return { error: 'NOT_PENDING' }

  const deadlinePassed = new Date() > new Date(agreement.settlement.ownerActionDeadline)
  const hasDamages = (agreement.settlement.damageDeductions || []).length > 0
  if (!deadlinePassed && !hasDamages) return { error: 'NOT_ELIGIBLE' }

  // Fire SETTLEMENT_IGNORED if owner missed the deadline
  if (deadlinePassed) {
    createReputationSignal({
      userId: agreement.ownerId,
      role: ROLES.OWNER,
      signalType: SIGNAL_TYPES.SETTLEMENT_IGNORED,
      weightedValue: SIGNAL_WEIGHTS[SIGNAL_TYPES.SETTLEMENT_IGNORED],
      sourceRef: { collection: 'RentalAgreement', id: agreement._id },
      pushImmediate: true,
    }).catch(err => console.error('[reputation] settlement-ignored failed:', err.message))
  }

  // Find the most recent owner-side reputation signal for this agreement to attach the Dispute to.
  const recentSignal = await reputationSignalModel.findOne({
    'sourceRef.id': agreement._id,
    'sourceRef.collection': 'RentalAgreement',
    role: ROLES.OWNER,
  }).sort({ createdAt: -1 })

  let dispute
  if (recentSignal) {
    dispute = await disputeModel.create({
      signalId: recentSignal._id,
      raisedByUserId: tenantUserId,
      reason: (reason || 'Settlement disputed by tenant').slice(0, 1000),
      status: DISPUTE_STATUS.OPEN,
    })
    recentSignal.status = SIGNAL_STATUS.DISPUTED
    await recentSignal.save()
  } else {
    // No prior owner signal — create a placeholder so the Dispute has something to attach to.
    const placeholder = await reputationSignalModel.create({
      userId: agreement.ownerId,
      role: ROLES.OWNER,
      signalType: SIGNAL_TYPES.SETTLEMENT_IGNORED,
      weightedValue: 0,
      sourceRef: { collection: 'RentalAgreement', id: agreement._id },
      occurredAt: new Date(),
      status: SIGNAL_STATUS.DISPUTED,
    })
    dispute = await disputeModel.create({
      signalId: placeholder._id,
      raisedByUserId: tenantUserId,
      reason: (reason || 'Settlement disputed by tenant').slice(0, 1000),
      status: DISPUTE_STATUS.OPEN,
    })
  }

  agreement.settlement.status = 'disputed'
  agreement.settlement.disputeId = dispute._id
  await agreement.save({ validateModifiedOnly: true })

  await NotificationModel.createNotification({
    userId: agreement.ownerId,
    type: 'settlement_disputed',
    message: 'Your tenant has raised a dispute on the settlement.',
    meta: { agreementId: agreement._id, disputeId: dispute._id },
    triggeredAt: new Date(),
  })

  return { agreement, dispute }
}

const RentalAgreementModel = {
  createRentalAgreement,
  getRentalAgreements,
  getRentalAgreementsByTenant,
  getRentalAgreementsByOwner,
  getRentalAgreementById,
  updateRentalAgreementById,
  terminateRentalAgreement,
  deleteRentalAgreementById,
  createAgreementPdfOnly,
  submitLeaveNotice,
  addDamagesToSettlement,
  markRefundPaid,
  raiseSettlementDispute
}

export default RentalAgreementModel
