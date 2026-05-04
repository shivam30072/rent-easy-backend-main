import PartnerProfileModel from './PartnerProfile.Model.js'
import { PARTNER_PROFILE_MESSAGES } from './PartnerProfile.Constant.js'
import { uploadBase64File } from '../../helper/s3.js'

const create = async (req, res) => {
  try {
    console.log('[PartnerProfile.create] body:', JSON.stringify(req.body, null, 2))
    console.log('[PartnerProfile.create] userId:', req.user._id)
    const existing = await PartnerProfileModel.getMyProfileService(req.user._id)
    if (existing) {
      console.log('[PartnerProfile.create] already exists for', req.user._id)
      return res.error(400, PARTNER_PROFILE_MESSAGES.ALREADY_EXISTS)
    }
    const data = { ...req.body, userId: req.user._id }
    const profile = await PartnerProfileModel.createProfileService(data)
    console.log('[PartnerProfile.create] success, completionScore:', profile.completionScore)
    return res.success(201, PARTNER_PROFILE_MESSAGES.CREATED, profile)
  } catch (err) {
    console.error('[PartnerProfile.create] FAILED')
    console.error('  message:', err.message)
    console.error('  name:', err.name)
    if (err.errors) {
      console.error('  validation errors:')
      for (const [field, fieldErr] of Object.entries(err.errors)) {
        console.error(`    ${field}: ${fieldErr.message}`)
      }
    }
    console.error('  stack:', err.stack)
    return res.error(500, err.message || 'Failed to create partner profile.', { name: err.name, errors: err.errors })
  }
}

const update = async (req, res) => {
  try {
    console.log('[PartnerProfile.update] body:', JSON.stringify(req.body, null, 2))
    console.log('[PartnerProfile.update] userId:', req.user._id)
    const profile = await PartnerProfileModel.updateProfileService(req.user._id, req.body)
    if (!profile) {
      console.log('[PartnerProfile.update] not found for', req.user._id)
      return res.error(404, PARTNER_PROFILE_MESSAGES.NOT_FOUND)
    }
    console.log('[PartnerProfile.update] success, completionScore:', profile.completionScore)
    return res.success(200, PARTNER_PROFILE_MESSAGES.UPDATED, profile)
  } catch (err) {
    console.error('[PartnerProfile.update] FAILED')
    console.error('  message:', err.message)
    console.error('  name:', err.name)
    if (err.errors) {
      console.error('  validation errors:')
      for (const [field, fieldErr] of Object.entries(err.errors)) {
        console.error(`    ${field}: ${fieldErr.message}`)
      }
    }
    console.error('  stack:', err.stack)
    return res.error(500, err.message || 'Failed to update partner profile.', { name: err.name, errors: err.errors })
  }
}

const getMine = async (req, res) => {
  const profile = await PartnerProfileModel.getMyProfileService(req.user._id)
  if (!profile) return res.error(404, PARTNER_PROFILE_MESSAGES.NOT_FOUND)
  return res.success(200, PARTNER_PROFILE_MESSAGES.FETCHED, profile)
}

const getByUser = async (req, res) => {
  const { userId } = req.body
  const profile = await PartnerProfileModel.getProfileByUserIdService(userId)
  if (!profile) return res.error(404, PARTNER_PROFILE_MESSAGES.NOT_FOUND)
  return res.success(200, PARTNER_PROFILE_MESSAGES.FETCHED, profile)
}

const uploadPhoto = async (req, res) => {
  const { base64, fileName, mimetype } = req.body
  if (!base64) return res.error(400, 'base64 image data is required.')
  const prefix = `partner-profile/${req.user._id}`
  const { url } = await uploadBase64File(base64, fileName || 'photo.jpg', mimetype || 'image/jpeg', prefix)
  return res.success(201, 'Photo uploaded.', { url })
}

const uploadVoiceIntro = async (req, res) => {
  const { base64, fileName, mimetype, durationSec } = req.body
  if (!base64) return res.error(400, 'base64 audio data is required.')
  if (durationSec && durationSec > 30) return res.error(400, 'Voice intro must be 30 seconds or less.')
  const prefix = `partner-profile-voice/${req.user._id}`
  const { url } = await uploadBase64File(base64, fileName || 'intro.m4a', mimetype || 'audio/m4a', prefix)
  return res.success(201, 'Voice intro uploaded.', { url, durationSec })
}

const setPulse = async (req, res) => {
  const { active } = req.body
  const profile = await PartnerProfileModel.setPulseService(req.user._id, !!active)
  if (!profile) return res.error(404, PARTNER_PROFILE_MESSAGES.NOT_FOUND)
  return res.success(200, PARTNER_PROFILE_MESSAGES.PULSE_TOGGLED, profile)
}

const setWeightBoost = async (req, res) => {
  const { dimensions = [] } = req.body
  if (dimensions.length > 2) return res.error(400, 'At most 2 weight boosts allowed.')
  const profile = await PartnerProfileModel.setWeightBoostService(req.user._id, dimensions)
  if (!profile) return res.error(404, PARTNER_PROFILE_MESSAGES.NOT_FOUND)
  return res.success(200, PARTNER_PROFILE_MESSAGES.UPDATED, profile)
}

const completionStatus = async (req, res) => {
  const data = await PartnerProfileModel.completionStatusService(req.user._id)
  return res.success(200, 'Completion status', data)
}

const PartnerProfileController = {
  create, update, getMine, getByUser, uploadPhoto, uploadVoiceIntro,
  setPulse, setWeightBoost, completionStatus,
}

export default PartnerProfileController
