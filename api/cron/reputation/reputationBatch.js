// Nightly job — enqueue a recompute for every user-role pair that has either:
//   (a) at least one signal in the last 90 days, OR
//   (b) lastComputedAt older than 7 days
//
// Handles natural decay drift and catches anything missed by the event-push path.

import cron from 'node-cron'
import { reputationSignalModel } from '../../resources/ReputationSignal/ReputationSignal.Schema.js'
import { reputationScoreModel } from '../../resources/ReputationScore/ReputationScore.Schema.js'
import { enqueueReputationRecompute } from '../../services/reputation.service.js'
import { COMPUTE_REASONS } from '../../resources/ReputationScore/ReputationScore.Constant.js'

// Daily at 03:00 UTC
cron.schedule('0 3 * * *', async () => {
  console.log(`[CRON reputation-batch] started ${new Date().toISOString()}`)
  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const recentlyActive = await reputationSignalModel.aggregate([
      { $match: { occurredAt: { $gte: ninetyDaysAgo } } },
      { $group: { _id: { userId: '$userId', role: '$role' } } },
    ])

    const stale = await reputationScoreModel
      .find({ lastComputedAt: { $lt: sevenDaysAgo } }, { userId: 1, role: 1 })
      .lean()

    const set = new Map()
    for (const a of recentlyActive) set.set(`${a._id.userId}:${a._id.role}`, a._id)
    for (const s of stale) set.set(`${s.userId}:${s.role}`, { userId: s.userId, role: s.role })

    for (const target of set.values()) {
      await enqueueReputationRecompute(target.userId, target.role, COMPUTE_REASONS.NIGHTLY_BATCH)
    }

    console.log(`[CRON reputation-batch] enqueued ${set.size} recomputes`)
  } catch (err) {
    console.error('[CRON reputation-batch] error:', err.message)
  }
})
