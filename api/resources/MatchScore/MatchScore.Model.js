import { matchScoreModel } from './MatchScore.Schema.js'
import { partnerProfileModel } from '../PartnerProfile/PartnerProfile.Schema.js'
import { computeReciprocalScores } from '../../services/matchScoring/scoreEngine.js'
import { reputationScoreModel } from '../ReputationScore/ReputationScore.Schema.js'

const getReputationScore = async (userId) => {
  try {
    const r = await reputationScoreModel.findOne({ userId, role: 'tenant' })
    return r?.score ?? null
  } catch { return null }
}

const upsertScore = async (profileAId, profileBId) => {
  const [pa, pb] = await Promise.all([
    partnerProfileModel.findById(profileAId),
    partnerProfileModel.findById(profileBId),
  ])
  if (!pa || !pb) return null
  const [repA, repB] = await Promise.all([
    getReputationScore(pa.userId),
    getReputationScore(pb.userId),
  ])
  const { aToB, bToA } = computeReciprocalScores({
    profileA: pa.toObject(),
    profileB: pb.toObject(),
    reputationOfA: repA,
    reputationOfB: repB,
  })
  // Normalize ordering so (A, B) and (B, A) collapse into one row by smaller id first
  const [smaller, larger] = String(profileAId) < String(profileBId)
    ? [profileAId, profileBId, aToB, bToA]
    : [profileBId, profileAId, bToA, aToB]
  const sToL = String(profileAId) < String(profileBId) ? aToB : bToA
  const lToS = String(profileAId) < String(profileBId) ? bToA : aToB
  return await matchScoreModel.findOneAndUpdate(
    { profileA: smaller, profileB: larger },
    {
      $set: {
        profileA: smaller,
        profileB: larger,
        scoreAtoB: sToL.score,
        scoreBtoA: lToS.score,
        hardGatesPassed: sToL.hardGatesPassed,
        breakdownAtoB: sToL.breakdown,
        breakdownBtoA: lToS.breakdown,
        whyYouMatch: sToL.whyYouMatch,
        conflictReasons: sToL.conflictReasons,
        distanceKm: sToL.distanceKm,
        computedAt: new Date(),
      },
    },
    { upsert: true, new: true }
  )
}

const getScoreForViewer = async (viewerProfileId, otherProfileId) => {
  const smaller = String(viewerProfileId) < String(otherProfileId) ? viewerProfileId : otherProfileId
  const larger = String(viewerProfileId) < String(otherProfileId) ? otherProfileId : viewerProfileId
  const row = await matchScoreModel.findOne({ profileA: smaller, profileB: larger })
  if (!row) return null
  const isA = String(viewerProfileId) === String(smaller)
  return {
    score: isA ? row.scoreAtoB : row.scoreBtoA,
    breakdown: isA ? row.breakdownAtoB : row.breakdownBtoA,
    hardGatesPassed: row.hardGatesPassed,
    whyYouMatch: row.whyYouMatch,
    conflictReasons: row.conflictReasons,
    distanceKm: row.distanceKm,
  }
}

const recomputeAllForProfile = async (profileId) => {
  // Recompute scores against every other profile in same city.
  const me = await partnerProfileModel.findById(profileId)
  if (!me) return 0
  const others = await partnerProfileModel.find({
    _id: { $ne: profileId },
    'location.preferredCity': me.location.preferredCity,
  }).select('_id')
  let n = 0
  for (const o of others) {
    await upsertScore(profileId, o._id)
    n += 1
  }
  return n
}

const MatchScoreModel = { upsertScore, getScoreForViewer, recomputeAllForProfile }

export default MatchScoreModel
