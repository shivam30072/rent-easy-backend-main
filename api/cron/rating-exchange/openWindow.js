// Daily — find RentalAgreements that have just ended (end-date passed and status is
// 'active') OR have just been terminated (status 'terminated' but no exchange yet),
// and open a RatingExchange window for each.
//
// Idempotent: openWindowForAgreement returns the existing exchange if one already exists
// (uniqueness on agreementId).

import cron from 'node-cron'
import { rentalAgreementModel } from '../../resources/RentalAgreement/RentalAgreement.Schema.js'
import RatingExchangeModel from '../../resources/RatingExchange/RatingExchange.Model.js'

// Daily at 02:45 UTC (between agreement-completion at 02:30 and reputation-batch at 03:00)
cron.schedule('45 2 * * *', async () => {
  console.log(`[CRON rating-window-open] started ${new Date().toISOString()}`)
  try {
    const now = new Date()
    const candidates = await rentalAgreementModel
      .find({
        $or: [
          { status: 'active', agreementEndDate: { $lte: now } },
          { status: 'terminated' },
        ],
      })
      .lean()

    let opened = 0
    for (const a of candidates) {
      const exchange = await RatingExchangeModel.openWindowForAgreement(a, now)
      if (exchange?.createdAt && Math.abs(new Date(exchange.createdAt).getTime() - now.getTime()) < 60_000) {
        opened++
      }
    }
    console.log(`[CRON rating-window-open] opened ${opened} new exchange windows (out of ${candidates.length} candidates)`)
  } catch (err) {
    console.error('[CRON rating-window-open] error:', err.message)
  }
})
