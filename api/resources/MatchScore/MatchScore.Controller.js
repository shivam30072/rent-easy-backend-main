import MatchScoreModel from './MatchScore.Model.js'
import PartnerProfileModel from '../PartnerProfile/PartnerProfile.Model.js'
import { matchScoreModel } from './MatchScore.Schema.js'
import { enqueueMatchRecompute } from '../../services/matchScoring/matchScore.service.js'

const feed = async (req, res) => {
  const { limit = 15, cursor = null, radiusOverride } = req.body
  const me = await PartnerProfileModel.getMyProfileService(req.user._id)
  if (!me) return res.error(404, 'Complete your partner profile first.')

  // Compute-on-miss: a profile that has never been scored (new or never
  // processed by the worker) gets one inline recompute, then we enqueue for
  // future freshness. Steady-state loads skip this entirely.
  if (!me.matchScoresComputedAt) {
    await MatchScoreModel.recomputeAllForProfile(me._id)
    enqueueMatchRecompute(me._id, 'feed-cold-start')
  }

  const radiusKm = radiusOverride || me.location?.radiusKm || 5
  const result = await MatchScoreModel.getFeedForViewer(me._id, { limit, cursor, radiusKm })
  return res.success(200, 'Feed fetched', result)
}

const score = async (req, res) => {
  const { targetUserId } = req.body
  const me = await PartnerProfileModel.getMyProfileService(req.user._id)
  const target = await PartnerProfileModel.getProfileByUserIdService(targetUserId)
  if (!me || !target) return res.error(404, 'Profile not found.')
  let row = await MatchScoreModel.getScoreForViewer(me._id, target._id)
  if (!row) {
    await MatchScoreModel.upsertScore(me._id, target._id)
    row = await MatchScoreModel.getScoreForViewer(me._id, target._id)
  }
  return res.success(200, 'Match score', row)
}

const dealbreakerRadar = async (req, res) => {
  const { targetUserId } = req.body
  const me = await PartnerProfileModel.getMyProfileService(req.user._id)
  const target = await PartnerProfileModel.getProfileByUserIdService(targetUserId)
  if (!me || !target) return res.error(404, 'Profile not found.')
  const row = await MatchScoreModel.getScoreForViewer(me._id, target._id)
  const conflicts = row?.conflictReasons?.length || 0
  const total = me.dealbreakers?.length || 3
  return res.success(200, 'Dealbreaker radar', {
    totalDealbreakers: total,
    conflictsCount: conflicts,
    cleared: total - conflicts,
    ok: conflicts === 0,
  })
}

const scoreDebug = async (req, res) => {
  const { targetUserId } = req.body
  const me = await PartnerProfileModel.getMyProfileService(req.user._id)
  const target = await PartnerProfileModel.getProfileByUserIdService(targetUserId)
  if (!me || !target) return res.error(404, 'Profile not found.')
  const row = await matchScoreModel.findOne({
    $or: [
      { profileA: me._id, profileB: target._id },
      { profileA: target._id, profileB: me._id },
    ],
  })
  return res.success(200, 'Debug', { row, me, target })
}

const MatchScoreController = { feed, score, dealbreakerRadar, scoreDebug }
export default MatchScoreController
