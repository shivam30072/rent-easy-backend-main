import { matchScoreModel } from './MatchScore.Schema.js'
import { partnerProfileModel } from '../PartnerProfile/PartnerProfile.Schema.js'
import { computeReciprocalScores } from '../../services/matchScoring/scoreEngine.js'
import { reputationScoreModel } from '../ReputationScore/ReputationScore.Schema.js'
import { partnerListingModel } from '../PartnerListing/PartnerListing.Schema.js'
import SwipeActionModel from '../SwipeAction/SwipeAction.Model.js'

const MAX_RADIUS_CAP_KM = 25 // PartnerProfile location.radiusKm schema max

// Case-/whitespace-insensitive exact city match for the candidate query, so
// "Noida", "noida", and "Noida " all collapse to one city. Mirrors the
// trim+lowercase comparison the hard gate uses in scoreEngine.js.
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const cityMatcher = (city) => {
  const c = (city || '').trim()
  return c ? new RegExp(`^${escapeRegex(c)}$`, 'i') : null
}

const encodeCursor = (score, profileId) =>
  Buffer.from(`${score}:${profileId}`).toString('base64')

const decodeCursor = (cursor) => {
  const [score, profileId] = Buffer.from(cursor, 'base64').toString('utf8').split(':')
  return { score: Number(score), profileId }
}

const haversineKm = (a, b) => {
  if (a?.lat == null || a?.lng == null || b?.lat == null || b?.lng == null) return Infinity
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * R * Math.asin(Math.sqrt(h))
}

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
        whyYouMatchAtoB: sToL.whyYouMatch,
        whyYouMatchBtoA: lToS.whyYouMatch,
        conflictReasonsAtoB: sToL.conflictReasons,
        conflictReasonsBtoA: lToS.conflictReasons,
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
    whyYouMatch: isA ? row.whyYouMatchAtoB : row.whyYouMatchBtoA,
    conflictReasons: isA ? row.conflictReasonsAtoB : row.conflictReasonsBtoA,
    distanceKm: row.distanceKm,
  }
}

const recomputeAllForProfile = async (profileId) => {
  const me = await partnerProfileModel.findById(profileId)
  if (!me) return 0
  const cityMatch = cityMatcher(me.location?.preferredCity)
  if (!cityMatch) return 0
  // City is the only hard candidate filter. GPS is optional: a profile without
  // coordinates still matches on city (proximity just won't contribute), so the
  // feed never silently empties because someone skipped "Use my GPS location".
  const others = await partnerProfileModel
    .find({
      _id: { $ne: profileId },
      'location.preferredCity': cityMatch,
    })
    .select('_id location.gpsCoords')
  const myGps = me.location?.gpsCoords
  const haveMyGps = myGps?.lat != null && myGps?.lng != null
  let n = 0
  for (const o of others) {
    const oGps = o.location?.gpsCoords
    const haveOGps = oGps?.lat != null && oGps?.lng != null
    // Only enforce the radius cap when both sides have coordinates; otherwise
    // fall back to a city-only match.
    if (haveMyGps && haveOGps && haversineKm(myGps, oGps) > MAX_RADIUS_CAP_KM) continue
    await upsertScore(profileId, o._id)
    n += 1
  }
  await partnerProfileModel.updateOne({ _id: profileId }, { $set: { matchScoresComputedAt: new Date() } })
  return n
}

const getFeedForViewer = async (viewerProfileId, { limit = 15, cursor = null, radiusKm } = {}) => {
  const me = await partnerProfileModel.findById(viewerProfileId)
  if (!me) return { items: [], nextCursor: null, hasMore: false, total: 0 }

  const effectiveRadius = radiusKm || me.location?.radiusKm || 5
  const swiped = await SwipeActionModel.getSwipedTargetIds(viewerProfileId)
  const swipedSet = new Set(swiped.map(String))

  const rows = await matchScoreModel.find({
    $or: [{ profileA: viewerProfileId }, { profileB: viewerProfileId }],
    hardGatesPassed: true,
  })

  // Derive my-perspective score + counterpart, drop swiped/out-of-radius.
  const ranked = []
  for (const row of rows) {
    const iAmA = String(row.profileA) === String(viewerProfileId)
    const counterpartId = iAmA ? row.profileB : row.profileA
    if (swipedSet.has(String(counterpartId))) continue
    if (row.distanceKm != null && row.distanceKm > effectiveRadius) continue
    ranked.push({
      counterpartId,
      score: iAmA ? row.scoreAtoB : row.scoreBtoA,
      breakdown: iAmA ? row.breakdownAtoB : row.breakdownBtoA,
      hardGatesPassed: row.hardGatesPassed,
      whyYouMatch: iAmA ? row.whyYouMatchAtoB : row.whyYouMatchBtoA,
      conflictReasons: iAmA ? row.conflictReasonsAtoB : row.conflictReasonsBtoA,
      distanceKm: row.distanceKm,
    })
  }

  // Stable sort: score desc, then counterpartId asc (cursor tie-break key).
  ranked.sort(
    (a, b) =>
      b.score - a.score || String(a.counterpartId).localeCompare(String(b.counterpartId)),
  )
  const total = ranked.length

  let startIdx = 0
  if (cursor) {
    const { score: cScore, profileId: cId } = decodeCursor(cursor)
    startIdx = ranked.findIndex(
      (r) =>
        r.score < cScore ||
        (r.score === cScore && String(r.counterpartId).localeCompare(String(cId)) > 0),
    )
    if (startIdx === -1) startIdx = ranked.length
  }

  const page = ranked.slice(startIdx, startIdx + limit)
  const hasMore = startIdx + limit < ranked.length
  const last = page[page.length - 1]
  const nextCursor = hasMore && last ? encodeCursor(last.score, last.counterpartId) : null

  // Batch-hydrate counterpart profiles + their latest active listing.
  const counterpartIds = page.map((r) => r.counterpartId)
  const profiles = await partnerProfileModel.find({ _id: { $in: counterpartIds } })
  const profileById = new Map(profiles.map((p) => [String(p._id), p]))
  const userIds = profiles.map((p) => p.userId)
  const listings = await partnerListingModel
    .find({ createdBy: { $in: userIds }, status: 'active' })
    .sort({ createdAt: -1 })
  const listingByUser = new Map()
  for (const l of listings) {
    const k = String(l.createdBy)
    if (!listingByUser.has(k)) listingByUser.set(k, l) // newest first due to sort
  }

  const items = page
    .map((r) => {
      const profile = profileById.get(String(r.counterpartId))
      if (!profile) return null
      return {
        profile,
        match: {
          score: r.score,
          breakdown: r.breakdown,
          hardGatesPassed: r.hardGatesPassed,
          whyYouMatch: r.whyYouMatch,
          conflictReasons: r.conflictReasons,
          distanceKm: r.distanceKm,
        },
        listing: listingByUser.get(String(profile.userId)) || null,
      }
    })
    .filter(Boolean)

  return { items, nextCursor, hasMore, total }
}

const MatchScoreModel = { upsertScore, getScoreForViewer, recomputeAllForProfile, getFeedForViewer }

export default MatchScoreModel
