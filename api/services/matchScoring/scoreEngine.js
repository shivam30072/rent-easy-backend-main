// scoreEngine.js — pure scoring function for partner matching

const haversineKm = (a, b) => {
  if (!a || !b) return Infinity
  const toRad = d => (d * Math.PI) / 180
  const R = 6371
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const x = Math.sin(dLat/2) ** 2 + Math.sin(dLng/2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * R * Math.asin(Math.sqrt(x))
}

const dateRangesOverlap = (a, b) => {
  if (!a?.earliest || !a?.latest || !b?.earliest || !b?.latest) return false
  return new Date(a.earliest) <= new Date(b.latest) && new Date(b.earliest) <= new Date(a.latest)
}

const budgetRangesOverlap = (a, b) => {
  return a.rentMin <= b.rentMax && b.rentMin <= a.rentMax
}

const evaluateHardGates = (A, B) => {
  // Gender preference: simplified — assume both must be ok with each other's gender.
  // For Phase 1 we use a simple "any-or-match" rule via dealbreakers (e.g. "must_be_female_only" not in v1 list, so we default open).
  const moveInOk = dateRangesOverlap(A.moveIn, B.moveIn)
  const budgetOk = budgetRangesOverlap(A.budget, B.budget)
  const cityOk = (A.location?.preferredCity || '').toLowerCase() === (B.location?.preferredCity || '').toLowerCase()
  const roomTypeOk = A.roomType === B.roomType || A.roomType === 'any' || B.roomType === 'any'
  return {
    passed: moveInOk && budgetOk && cityOk && roomTypeOk,
    moveInOk, budgetOk, cityOk, roomTypeOk,
  }
}

const scoreLifestyle = (A, B) => {
  const fields = ['sleepSchedule', 'cleanliness', 'smoking', 'drinking', 'diet', 'pets', 'noiseLevel']
  const perField = 35 / fields.length
  let pts = 0
  const matches = []
  for (const f of fields) {
    const av = A.lifestyle?.[f]
    const bv = B.lifestyle?.[f]
    if (!av || !bv) continue
    if (av === bv) { pts += perField; matches.push(f) }
    else if (av === 'no_preference' || bv === 'no_preference' || av === 'flexible' || bv === 'flexible') {
      pts += perField * 0.6
    }
  }
  return { points: Math.round(pts * 10) / 10, matches }
}

const scoreProximity = (A, B) => {
  const a = A.location?.gpsCoords
  const b = B.location?.gpsCoords
  if (!a?.lat || !b?.lat) return { points: 0, distanceKm: null }
  const km = haversineKm(a, b)
  const radius = A.location?.radiusKm ?? 5
  if (km > radius) return { points: 0, distanceKm: km }
  const points = 20 - (km / radius) * 15
  return { points: Math.max(5, Math.round(points * 10) / 10), distanceKm: km }
}

const scorePersonality = (A, B) => {
  let pts = 0
  if (A.personality?.introExtroScale && B.personality?.introExtroScale) {
    const diff = Math.abs(A.personality.introExtroScale - B.personality.introExtroScale)
    if (diff <= 1) pts += 6
    else if (diff <= 2) pts += 3
  }
  if (A.personality?.wfh && A.personality.wfh === B.personality?.wfh) pts += 4
  if (A.personality?.hostingStyle && A.personality.hostingStyle === B.personality?.hostingStyle) pts += 3
  if (A.personality?.sharingStyle && A.personality.sharingStyle === B.personality?.sharingStyle) pts += 2
  return { points: Math.min(15, pts) }
}

const scoreLogistics = (A, B) => {
  let pts = 0
  if (A.basics?.profession && A.basics.profession === B.basics.profession) pts += 6
  if (A.basics?.age && B.basics?.age && Math.abs(A.basics.age - B.basics.age) <= 5) pts += 4
  if (A.personality?.wfh && A.personality.wfh === B.personality?.wfh) pts += 2
  return { points: Math.min(12, pts) }
}

const scoreInterests = (A, B) => {
  const aSet = new Set(A.interests || [])
  const bSet = new Set(B.interests || [])
  if (aSet.size === 0 || bSet.size === 0) return { points: 0, shared: [] }
  const shared = [...aSet].filter(i => bSet.has(i))
  const max = Math.max(aSet.size, bSet.size)
  const points = (shared.length / max) * 10
  return { points: Math.round(points * 10) / 10, shared }
}

const scorePrompts = (A, B) => {
  const aLen = A.prompts?.length || 0
  const bLen = B.prompts?.length || 0
  if (aLen >= 3 && bLen >= 3) return { points: 5 }
  if (aLen >= 3 || bLen >= 3) return { points: 2 }
  return { points: 0 }
}

const scoreReputation = (targetReputation) => {
  if (!targetReputation) return { points: 0 }
  if (targetReputation >= 700) return { points: 3 }
  if (targetReputation >= 600) return { points: 1 }
  return { points: 0 }
}

const evaluateDealbreakers = (selfDealbreakers, target) => {
  const conflicts = []
  for (const tag of (selfDealbreakers || [])) {
    switch (tag) {
      case 'no_smokers': if (target.lifestyle?.smoking === 'yes') conflicts.push(tag); break
      case 'no_drinkers': if (target.lifestyle?.drinking === 'yes') conflicts.push(tag); break
      case 'must_be_veg': if (target.lifestyle?.diet === 'non_veg') conflicts.push(tag); break
      case 'no_pets': if (target.lifestyle?.pets === 'have') conflicts.push(tag); break
      case 'must_be_quiet': if (target.lifestyle?.noiseLevel === 'lively') conflicts.push(tag); break
      case 'must_match_sleep_schedule':
        if (target.lifestyle?.sleepSchedule && target.lifestyle.sleepSchedule !== 'flexible') {
          // Requires comparison — handled by caller passing the self schedule too. Keep simple here.
        }
        break
      case 'must_be_clean': if (target.lifestyle?.cleanliness === 'relaxed') conflicts.push(tag); break
      // others are conversational, not auto-detectable from profile fields alone
    }
  }
  return conflicts
}

const buildWhyYouMatch = (breakdown, lifestyleMatches, distanceKm, sharedInterests) => {
  const reasons = []
  if (lifestyleMatches.includes('sleepSchedule')) reasons.push('Same sleep schedule')
  if (lifestyleMatches.includes('diet')) reasons.push('Same diet preference')
  if (lifestyleMatches.includes('cleanliness')) reasons.push('Same cleanliness style')
  if (distanceKm !== null && distanceKm < 3) reasons.push(`Just ${distanceKm.toFixed(1)} km away`)
  if (sharedInterests.length > 0) reasons.push(`Both into ${sharedInterests.slice(0, 2).join(', ')}`)
  return reasons.slice(0, 3)
}

export const computeScore = ({ profileA, profileB, reputationOfB = null, weightBoostsA = [] }) => {
  const A = profileA
  const B = profileB

  const gates = evaluateHardGates(A, B)

  const lifestyle = scoreLifestyle(A, B)
  const proximity = scoreProximity(A, B)
  const personality = scorePersonality(A, B)
  const logistics = scoreLogistics(A, B)
  const interests = scoreInterests(A, B)
  const prompts = scorePrompts(A, B)
  const reputation = scoreReputation(reputationOfB)

  // Apply A's weight boosts (+5 each)
  let boostBonus = 0
  for (const b of weightBoostsA) {
    if (b === 'lifestyle') boostBonus += 5
    if (b === 'proximity') boostBonus += 5
    if (b === 'personality') boostBonus += 5
    if (b === 'logistics') boostBonus += 5
    if (b === 'interests') boostBonus += 5
  }

  let total = lifestyle.points + proximity.points + personality.points
            + logistics.points + interests.points + prompts.points
            + reputation.points + boostBonus

  // Dealbreaker veto (cap at 40)
  const conflicts = evaluateDealbreakers(A.dealbreakers, B)
  if (conflicts.length > 0) total = Math.min(total, 40)

  const finalScore = Math.min(100, Math.round(total))

  return {
    hardGatesPassed: gates.passed,
    score: finalScore,
    breakdown: {
      lifestyle: Math.round(lifestyle.points),
      proximity: Math.round(proximity.points),
      personality: Math.round(personality.points),
      logistics: Math.round(logistics.points),
      interests: Math.round(interests.points),
      prompts: prompts.points,
      reputation: reputation.points,
      boostBonus,
    },
    distanceKm: proximity.distanceKm,
    whyYouMatch: buildWhyYouMatch(null, lifestyle.matches, proximity.distanceKm, interests.shared),
    conflictReasons: conflicts,
    gatesDetail: gates,
  }
}

export const computeReciprocalScores = ({ profileA, profileB, reputationOfA = null, reputationOfB = null }) => {
  const aToB = computeScore({ profileA, profileB, reputationOfB, weightBoostsA: profileA.weightBoosts || [] })
  const bToA = computeScore({ profileA: profileB, profileB: profileA, reputationOfB: reputationOfA, weightBoostsA: profileB.weightBoosts || [] })
  return { aToB, bToA }
}
