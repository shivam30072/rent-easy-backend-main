// Probe: enqueue a single recompute job and watch what happens.
// Cross-reference with the running server's stdout to see if the worker picks it up.
import 'dotenv/config'
import mongoose from 'mongoose'
import reputationQueue from '../workers/reputation.queue.js'
import { userModel } from '../resources/User/User.Schema.js'

async function main() {
  await mongoose.connect(process.env.MONGO_URI)
  const tenant = await userModel.findOne({ email: 'repsmoke-tenant@example.com' }).lean()
  console.log('Tenant id:', tenant._id)

  const jobId = `recompute:${tenant._id}:tenant`
  console.log('Adding job with id:', jobId)
  const job = await reputationQueue.add(
    'recompute-reputation',
    { userId: String(tenant._id), role: 'tenant', reason: 'probe_test' },
    { jobId, removeOnComplete: false, removeOnFail: 100, attempts: 1 }
  )
  console.log('Job added:', job.id, 'name:', job.name)

  // Wait briefly + poll job state
  for (let i = 0; i < 8; i++) {
    await new Promise(r => setTimeout(r, 500))
    const fresh = await reputationQueue.getJob(job.id)
    if (!fresh) {
      console.log(`[+${(i+1)*500}ms] job not found (likely already removed/completed)`)
      break
    }
    const state = await fresh.getState()
    console.log(`[+${(i+1)*500}ms] state=${state} returnvalue=${JSON.stringify(fresh.returnvalue)} failed=${fresh.failedReason || 'n/a'}`)
    if (state === 'completed' || state === 'failed') break
  }

  await reputationQueue.close()
  await mongoose.disconnect()
  process.exit(0)
}

main().catch(e => { console.error('ERR:', e); process.exit(1) })
