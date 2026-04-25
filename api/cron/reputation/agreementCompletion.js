// Daily — find RentalAgreements that have passed their agreementEndDate cleanly
// (status 'active' on the day they expire) and emit `agreement_completed` signals
// for both tenant and owner. Idempotent via a check for an existing signal whose
// sourceRef points at the agreement.
//
// Plan 4 will handle EARLY termination via RentalAgreement.Controller (not cron).

import cron from 'node-cron'
import { rentalAgreementModel } from '../../resources/RentalAgreement/RentalAgreement.Schema.js'
import { reputationSignalModel } from '../../resources/ReputationSignal/ReputationSignal.Schema.js'
import { createReputationSignal } from '../../services/reputation.service.js'
import { SIGNAL_TYPES, ROLES } from '../../resources/ReputationSignal/ReputationSignal.Constant.js'
import { SIGNAL_WEIGHTS } from '../../config/reputation.weights.js'

// Daily at 02:30 UTC (runs before the reputation batch at 03:00)
cron.schedule('30 2 * * *', async () => {
  console.log(`[CRON agreement-completion] started ${new Date().toISOString()}`)
  try {
    const now = new Date()
    const agreements = await rentalAgreementModel
      .find({
        status: 'active',
        agreementEndDate: { $lte: now },
      })
      .lean()

    let fired = 0
    for (const a of agreements) {
      const already = await reputationSignalModel
        .findOne({
          signalType: SIGNAL_TYPES.AGREEMENT_COMPLETED,
          'sourceRef.collection': 'RentalAgreement',
          'sourceRef.id': a._id,
        })
        .lean()
      if (already) continue

      await createReputationSignal({
        userId: a.userId,
        role: ROLES.TENANT,
        signalType: SIGNAL_TYPES.AGREEMENT_COMPLETED,
        weightedValue: SIGNAL_WEIGHTS[SIGNAL_TYPES.AGREEMENT_COMPLETED],
        sourceRef: { collection: 'RentalAgreement', id: a._id },
        occurredAt: a.agreementEndDate,
        pushImmediate: false,
      })

      await createReputationSignal({
        userId: a.ownerId,
        role: ROLES.OWNER,
        signalType: SIGNAL_TYPES.AGREEMENT_COMPLETED,
        weightedValue: SIGNAL_WEIGHTS[SIGNAL_TYPES.AGREEMENT_COMPLETED],
        sourceRef: { collection: 'RentalAgreement', id: a._id },
        occurredAt: a.agreementEndDate,
        pushImmediate: false,
      })

      fired++
    }
    console.log(`[CRON agreement-completion] fired signals for ${fired} agreements`)
  } catch (err) {
    console.error('[CRON agreement-completion] error:', err.message)
  }
})
