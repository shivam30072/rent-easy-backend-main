import 'dotenv/config'
import reputationQueue from '../workers/reputation.queue.js'

async function main() {
  const counts = await reputationQueue.getJobCounts()
  console.log('Queue counts:', counts)

  for (const state of ['waiting', 'active', 'delayed', 'failed', 'completed']) {
    const jobs = await reputationQueue.getJobs([state], 0, 10)
    console.log(`${state} jobs:`, jobs.length)
    for (const j of jobs) {
      console.log(`  id=${j.id} data=${JSON.stringify(j.data)} attempts=${j.attemptsMade} failedReason=${j.failedReason || 'n/a'}`)
    }
  }

  await reputationQueue.close()
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
