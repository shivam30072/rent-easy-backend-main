import MatchScoreModel from './MatchScore.Model.js'
import PartnerProfileModel from '../PartnerProfile/PartnerProfile.Model.js'
import { partnerProfileModel } from '../PartnerProfile/PartnerProfile.Schema.js'
import { matchScoreModel } from './MatchScore.Schema.js'
import SwipeActionModel from '../SwipeAction/SwipeAction.Model.js'
import { partnerListingModel } from '../PartnerListing/PartnerListing.Schema.js'

const feed = async (req, res) => {
  const { page = 0, limit = 10, radiusOverride } = req.body
  const me = await PartnerProfileModel.getMyProfileService(req.user._id)
  if (!me) return res.error(404, 'Complete your partner profile first.')

  // Find swiped target user IDs to dedup
  const swipedTargetIds = await SwipeActionModel.getSwipedTargetIds(me._id)

  // Geo-filter using 2dsphere — find profiles within radius
  const radiusKm = radiusOverride || me.location.radiusKm || 5
  const radiusMeters = radiusKm * 1000
  const candidates = await partnerProfileModel.find({
    _id: { $ne: me._id, $nin: swipedTargetIds },
    'location.preferredCity': me.location.preferredCity,
    'location.gpsCoords.lat': { $exists: true },
  })

  const enriched = []
  for (const c of candidates) {
    let row = await MatchScoreModel.getScoreForViewer(me._id, c._id)
    if (!row) {
      await MatchScoreModel.upsertScore(me._id, c._id)
      row = await MatchScoreModel.getScoreForViewer(me._id, c._id)
    }
    if (!row || !row.hardGatesPassed) continue
    const listing = await partnerListingModel.findOne({ createdBy: c.userId, status: 'active' }).sort({ createdAt: -1 })
    enriched.push({ profile: c, match: row, listing })
  }
  enriched.sort((a, b) => b.match.score - a.match.score)
  const sliced = enriched.slice(page * limit, page * limit + limit)
  return res.success(200, 'Feed fetched', { items: sliced, total: enriched.length, page, limit })
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
