import reputationQueue from './reputation.queue.js'
import { computeAndSaveScore } from '../services/reputation.service.js'

reputationQueue.process('recompute-reputation', 1, async (job) => {
  const { userId, role, reason } = job.data
  const result = await computeAndSaveScore(userId, role, reason)
  return { score: result?.score, tier: result?.tier }
})

reputationQueue.on('failed', (job, err) => {
  console.error(`[reputation.worker] job ${job?.id} failed:`, err.message)
})
