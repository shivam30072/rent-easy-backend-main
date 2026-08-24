// Nightly — enqueue a recompute for every partner profile whose scores were
// never computed or are older than STALE_DAYS. Absorbs reputation drift
// (match score depends on reputation) and backfills anything missed.
import cron from 'node-cron'
import { partnerProfileModel } from '../../resources/PartnerProfile/PartnerProfile.Schema.js'
import { enqueueMatchRecompute } from '../../services/matchScoring/matchScore.service.js'

const STALE_DAYS = 7

export async function runMatchScoreBatch() {
  console.log(`[CRON match-batch] started ${new Date().toISOString()}`)
  try {
    const staleBefore = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000)
    const profiles = await partnerProfileModel
      .find({
        $or: [
          { matchScoresComputedAt: { $exists: false } },
          { matchScoresComputedAt: null },
          { matchScoresComputedAt: { $lt: staleBefore } },
        ],
      })
      .select('_id')
    for (const p of profiles) {
      await enqueueMatchRecompute(p._id, 'nightly-batch')
    }
    console.log(`[CRON match-batch] enqueued ${profiles.length} recomputes`)
  } catch (err) {
    console.error('[CRON match-batch] error:', err.message)
  }
}

// Daily at 03:15 UTC (after the reputation batch at 03:00).
cron.schedule('15 3 * * *', runMatchScoreBatch)
