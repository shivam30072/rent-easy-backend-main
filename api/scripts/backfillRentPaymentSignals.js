// Run once after backfillReputationScores. Walks every existing RentPayment with status 'paid'
// and emits the corresponding rent_paid_on_time / rent_paid_late signal.
//
// Idempotency: this script is NOT idempotent. Re-running creates duplicate signals.
// If you need to re-run, first drop existing rent-payment-sourced signals:
//   db.reputationsignals.deleteMany({ 'sourceRef.collection': 'RentPayment' })
//
// Pre-req: the worker must be running (node app.js) for the recomputes to process.

import 'dotenv/config'
import mongoose from 'mongoose'
import { rentPaymentModel } from '../resources/RentPayment/RentPayment.Schema.js'
import {
  createReputationSignal,
  enqueueReputationRecompute,
} from '../services/reputation.service.js'
import { SIGNAL_TYPES, ROLES } from '../resources/ReputationSignal/ReputationSignal.Constant.js'
import { SIGNAL_WEIGHTS, weightForRentPaidLate } from '../config/reputation.weights.js'

async function main() {
  await mongoose.connect(process.env.MONGO_URI)
  console.log('[backfill-payments] connected to mongo')

  const payments = await rentPaymentModel.find({ status: 'paid' }).lean()
  console.log(`[backfill-payments] processing ${payments.length} payments`)

  const usersTouched = new Set()
  let processed = 0
  for (const p of payments) {
    if (!p.userId || !p.dueDate) continue
    const dueDate = new Date(p.dueDate)
    const paidDate = new Date(p.paymentDate || p.updatedAt || p.createdAt)
    const lateDays = Math.max(0, Math.ceil((paidDate - dueDate) / (1000 * 60 * 60 * 24)))

    if (lateDays <= 0) {
      await createReputationSignal({
        userId: p.userId,
        role: ROLES.TENANT,
        signalType: SIGNAL_TYPES.RENT_PAID_ON_TIME,
        weightedValue: SIGNAL_WEIGHTS[SIGNAL_TYPES.RENT_PAID_ON_TIME],
        rawValue: { daysLate: 0 },
        sourceRef: { collection: 'RentPayment', id: p._id },
        occurredAt: paidDate,
      })
    } else {
      await createReputationSignal({
        userId: p.userId,
        role: ROLES.TENANT,
        signalType: SIGNAL_TYPES.RENT_PAID_LATE,
        weightedValue: weightForRentPaidLate(lateDays),
        rawValue: { daysLate: lateDays },
        sourceRef: { collection: 'RentPayment', id: p._id },
        occurredAt: paidDate,
      })
    }

    usersTouched.add(String(p.userId))
    processed++
    if (processed % 100 === 0) console.log(`[backfill-payments] processed ${processed}/${payments.length}`)
  }

  console.log(`[backfill-payments] enqueueing recomputes for ${usersTouched.size} tenants`)
  for (const uid of usersTouched) {
    await enqueueReputationRecompute(uid, ROLES.TENANT, 'backfill')
  }

  console.log('[backfill-payments] done')
  process.exit(0)
}

main().catch(err => {
  console.error('[backfill-payments] fatal:', err)
  process.exit(1)
})
