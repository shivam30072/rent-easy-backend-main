import { partnerProfileModel } from './PartnerProfile.Schema.js'
import { userModel } from '../User/User.Schema.js'
import { COMPLETION_PHASE1_FIELDS } from './PartnerProfile.Constant.js'
import MatchScoreModel from '../MatchScore/MatchScore.Model.js'

const getNested = (obj, path) => path.split('.').reduce((o, k) => (o ? o[k] : undefined), obj)

const computeCompletionScore = (profile) => {
  const phase1Total = COMPLETION_PHASE1_FIELDS.length
  let phase1Done = 0
  for (const field of COMPLETION_PHASE1_FIELDS) {
    const v = getNested(profile, field)
    if (v === undefined || v === null) continue
    if (Array.isArray(v) && v.length === 0) continue
    if (typeof v === 'object' && Object.keys(v).length === 0) continue
    phase1Done += 1
  }
  let phase2Bonus = 0
  if (profile.personality?.introExtroScale) phase2Bonus += 5
  if (profile.interests?.length >= 3) phase2Bonus += 5
  if (profile.prompts?.length >= 3) phase2Bonus += 10
  if (profile.voiceIntro?.url) phase2Bonus += 5
  if (profile.schedule?.week?.length === 7) phase2Bonus += 5
  const phase1Pct = (phase1Done / phase1Total) * 70
  return Math.min(100, Math.round(phase1Pct + phase2Bonus))
}

const isPhase1Complete = (profile) => {
  for (const field of COMPLETION_PHASE1_FIELDS) {
    const v = getNested(profile, field)
    if (v === undefined || v === null) return false
    if (Array.isArray(v) && v.length === 0) return false
  }
  if (!profile.dealbreakers || profile.dealbreakers.length !== 3) return false
  return true
}

const createProfileService = async (data) => {
  try {
    const profile = await partnerProfileModel.create(data)
    profile.completionScore = computeCompletionScore(profile.toObject())
    await profile.save()
    if (isPhase1Complete(profile.toObject())) {
      await userModel.findByIdAndUpdate(data.userId, { partnerProfileCompleted: true })
    }
    MatchScoreModel.recomputeAllForProfile(profile._id).catch(err =>
      console.error('Match score recompute failed:', err.message)
    )
    return profile
  } catch (err) {
    console.error('[createProfileService] error:', err.name, err.message)
    if (err.errors) {
      for (const [k, e] of Object.entries(err.errors)) {
        console.error(`  field ${k}: ${e.message} (value:`, e.value, ')')
      }
    }
    throw err
  }
}

const updateProfileService = async (userId, updates) => {
  const profile = await partnerProfileModel.findOneAndUpdate(
    { userId },
    { $set: updates },
    { new: true }
  )
  if (!profile) return null
  profile.completionScore = computeCompletionScore(profile.toObject())
  await profile.save()
  if (isPhase1Complete(profile.toObject())) {
    await userModel.findByIdAndUpdate(userId, { partnerProfileCompleted: true })
  }
  MatchScoreModel.recomputeAllForProfile(profile._id).catch(err =>
    console.error('Match score recompute failed:', err.message)
  )
  return profile
}

const getMyProfileService = async (userId) => {
  return await partnerProfileModel.findOne({ userId })
}

const getProfileByUserIdService = async (userId) => {
  return await partnerProfileModel.findOne({ userId }).populate('userId', 'name profileUrl phone')
}

const setPulseService = async (userId, active) => {
  const expiresAt = active ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null
  return await partnerProfileModel.findOneAndUpdate(
    { userId },
    { $set: { 'pulseMode.active': active, 'pulseMode.expiresAt': expiresAt } },
    { new: true }
  )
}

const setWeightBoostService = async (userId, dimensions) => {
  return await partnerProfileModel.findOneAndUpdate(
    { userId },
    { $set: { weightBoosts: dimensions } },
    { new: true }
  )
}

const completionStatusService = async (userId) => {
  const profile = await partnerProfileModel.findOne({ userId })
  if (!profile) return { score: 0, missingFields: COMPLETION_PHASE1_FIELDS, exists: false }
  const obj = profile.toObject()
  const missing = COMPLETION_PHASE1_FIELDS.filter(f => {
    const v = getNested(obj, f)
    return v === undefined || v === null || (Array.isArray(v) && v.length === 0)
  })
  return { score: obj.completionScore, missingFields: missing, exists: true }
}

const PartnerProfileModel = {
  createProfileService,
  updateProfileService,
  getMyProfileService,
  getProfileByUserIdService,
  setPulseService,
  setWeightBoostService,
  completionStatusService,
  computeCompletionScore,
  isPhase1Complete,
}

export default PartnerProfileModel
