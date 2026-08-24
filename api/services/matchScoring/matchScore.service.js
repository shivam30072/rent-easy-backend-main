import matchQueue from '../../workers/match.queue.js'

// Job key dedupe: while a job for this profile is still waiting, a second
// enqueue with the same jobId is ignored. So a burst of profile edits
// collapses into one pending recompute.
export async function enqueueMatchRecompute(profileId, reason = 'profile-saved') {
  try {
    await matchQueue.add(
      'recompute-profile-matches',
      { profileId: String(profileId), reason },
      {
        jobId: `match:${profileId}`,
        removeOnComplete: true,
        removeOnFail: 100,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    )
  } catch (err) {
    console.error('[matchScore] enqueue failed:', err.message)
  }
}
