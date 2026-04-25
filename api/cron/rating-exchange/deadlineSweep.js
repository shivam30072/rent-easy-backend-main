// Daily — find PENDING RatingExchange rows whose 14-day deadline has passed and
// process them: publish the side that submitted, forfeit the side that didn't,
// fire reputation signals (rating-received + forfeited_rating).

import cron from 'node-cron'
import RatingExchangeModel from '../../resources/RatingExchange/RatingExchange.Model.js'

// Daily at 02:50 UTC
cron.schedule('50 2 * * *', async () => {
  console.log(`[CRON rating-deadline-sweep] started ${new Date().toISOString()}`)
  try {
    const count = await RatingExchangeModel.processDeadlinePassed(new Date())
    console.log(`[CRON rating-deadline-sweep] processed ${count} expired exchanges`)
  } catch (err) {
    console.error('[CRON rating-deadline-sweep] error:', err.message)
  }
})
