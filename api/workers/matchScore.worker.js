import matchQueue from './match.queue.js'
import MatchScoreModel from '../resources/MatchScore/MatchScore.Model.js'

matchQueue.process('recompute-profile-matches', 1, async (job) => {
  const { profileId } = job.data
  const pairs = await MatchScoreModel.recomputeAllForProfile(profileId)
  return { pairs }
})

matchQueue.on('failed', (job, err) => {
  console.error(`[matchScore.worker] job ${job?.id} failed:`, err.message)
})
