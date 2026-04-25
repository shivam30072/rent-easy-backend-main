// Run once after deployment. For every existing User:
//   1. Call ensureReputationScoreDocs to create their ReputationScore row(s)
//   2. Emit cold-start signals (kyc_verified if user.kycVerified, profile_completed if name/phone/profileUrl present)
//   3. For owners with bank details set, emit bank_verified
//   4. Enqueue an immediate recompute so scores are non-default after the run
//
// Pre-req: the worker must be running (node app.js) so the queued recomputes are processed.

import 'dotenv/config'
import mongoose from 'mongoose'
import { userModel } from '../resources/User/User.Schema.js'
import { ownerModel } from '../resources/Owner/Owner.Schema.js'
import {
  ensureReputationScoreDocs,
  createReputationSignal,
  enqueueReputationRecompute,
} from '../services/reputation.service.js'
import { SIGNAL_TYPES, ROLES } from '../resources/ReputationSignal/ReputationSignal.Constant.js'
import { SIGNAL_WEIGHTS } from '../config/reputation.weights.js'

async function main() {
  await mongoose.connect(process.env.MONGO_URI)
  console.log('[backfill] connected to mongo')

  const users = await userModel.find({ role: { $in: ['tenant', 'owner'] } }).lean()
  console.log(`[backfill] processing ${users.length} users`)

  let processed = 0
  for (const u of users) {
    await ensureReputationScoreDocs(u._id)

    const role = u.role === 'tenant' ? ROLES.TENANT : ROLES.OWNER

    if (u.kycVerified) {
      await createReputationSignal({
        userId: u._id,
        role,
        signalType: SIGNAL_TYPES.KYC_VERIFIED,
        weightedValue: SIGNAL_WEIGHTS[SIGNAL_TYPES.KYC_VERIFIED],
        sourceRef: { collection: 'User', id: u._id },
        occurredAt: u.updatedAt || u.createdAt,
      })
    }

    const profileComplete = !!(u.name && u.phone && u.profileUrl)
    if (profileComplete) {
      await createReputationSignal({
        userId: u._id,
        role,
        signalType: SIGNAL_TYPES.PROFILE_COMPLETED,
        weightedValue: SIGNAL_WEIGHTS[SIGNAL_TYPES.PROFILE_COMPLETED],
        sourceRef: { collection: 'User', id: u._id },
        occurredAt: u.updatedAt || u.createdAt,
      })
    }

    if (u.role === 'owner') {
      const owner = await ownerModel.findOne({ userId: u._id }).lean()
      const bankComplete = !!(
        owner?.bankDetails?.accountNumber &&
        owner?.bankDetails?.ifsc &&
        owner?.bankDetails?.accountHolderName
      )
      if (bankComplete) {
        await createReputationSignal({
          userId: u._id,
          role: ROLES.OWNER,
          signalType: SIGNAL_TYPES.BANK_VERIFIED,
          weightedValue: SIGNAL_WEIGHTS[SIGNAL_TYPES.BANK_VERIFIED],
          sourceRef: { collection: 'Owner', id: owner._id },
          occurredAt: owner.updatedAt || owner.createdAt,
        })
      }
    }

    await enqueueReputationRecompute(u._id, role, 'backfill')

    processed++
    if (processed % 50 === 0) console.log(`[backfill] processed ${processed}/${users.length}`)
  }

  console.log(`[backfill] done — ${processed} users processed; recompute jobs enqueued`)
  process.exit(0)
}

main().catch(err => {
  console.error('[backfill] fatal:', err)
  process.exit(1)
})
