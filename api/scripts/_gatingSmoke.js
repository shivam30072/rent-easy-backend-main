// Test the requireRatingsSubmitted middleware directly:
//   1. Open a fresh RatingExchange for the smoke users (creates pending exchange)
//   2. Try POST /enquiry as the tenant (gated endpoint)
//   3. Expect HTTP 403 with `requiresRating: true` and `exchangeId`
//   4. Submit the rating to clear the gate
//   5. Verify next call would proceed (we don't actually create an enquiry — too much setup; we just verify the gate clears)

import 'dotenv/config'
import mongoose from 'mongoose'
import { userModel } from '../resources/User/User.Schema.js'
import { ratingExchangeModel } from '../resources/RatingExchange/RatingExchange.Schema.js'
import { rentalAgreementModel } from '../resources/RentalAgreement/RentalAgreement.Schema.js'
import { propertyModel } from '../resources/Property/Property.Schema.js'
import { generateToken } from '../helper/jwtHelper.js'
import RatingExchangeModel from '../resources/RatingExchange/RatingExchange.Model.js'

const BASE = 'http://localhost:8080/api'

async function call(method, path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { data = text }
  return { status: res.status, data }
}

const log = (...args) => console.log('[GATE]', ...args)

async function main() {
  await mongoose.connect(process.env.MONGO_URI)
  const tenant = await userModel.findOne({ email: 'repsmoke-tenant@example.com' }).lean()
  const owner = await userModel.findOne({ email: 'repsmoke-owner@example.com' }).lean()
  const property = await propertyModel.findOne({ uniquePropertyCode: { $regex: '^SMOKE-' } }).lean()

  log(`Tenant ${tenant._id}, Owner ${owner._id}, Property ${property?._id}`)

  // Clear any prior pending exchange for these users so we have a clean slate
  await ratingExchangeModel.deleteMany({
    $or: [{ tenantId: tenant._id }, { ownerId: owner._id }],
  })
  log('Cleaned prior exchanges for these users')

  // Create a NEW agreement (terminated already) and open a fresh window
  const fakeAgreement = {
    _id: new mongoose.Types.ObjectId(),
    userId: tenant._id,
    ownerId: owner._id,
    agreementStartDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    agreementEndDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  }
  await rentalAgreementModel.create({
    ...fakeAgreement,
    roomId: new mongoose.Types.ObjectId(),
    propertyId: property?._id || new mongoose.Types.ObjectId(),
    rentAmount: 15000,
    securityDeposit: 15000,
    status: 'terminated',
    isActive: false,
    paymentSchedule: { frequency: 'monthly', dueDay: 5 },
  })
  const exchange = await RatingExchangeModel.openWindowForAgreement(fakeAgreement)
  log(`Opened fresh exchange ${exchange._id}`)

  const { accessToken: tToken } = await generateToken(tenant._id)

  // Try the gated endpoint — POST /enquiry — without submitting a rating first
  log('\n=== Test gating: POST /enquiry should 403 because tenant has unsubmitted rating ===')
  const r1 = await call('POST', '/enquiry', {
    token: tToken,
    body: {
      propertyId: String(property?._id || new mongoose.Types.ObjectId()),
      roomId: String(new mongoose.Types.ObjectId()),
      ownerId: String(owner._id),
      tenantName: 'Smoke Tenant',
      tenantPhone: '9999999999',
      propertyName: 'Smoke Property',
      enquiredBy: String(tenant._id),
    },
  })
  log(`status=${r1.status}  requiresRating=${r1.data?.requiresRating}  exchangeId=${r1.data?.exchangeId}  msg=${r1.data?.message}`)
  if (r1.status === 403 && r1.data?.requiresRating === true) {
    log('  ✓ PASS — gating correctly returned 403 with requiresRating payload')
  } else {
    log('  ⚠️  unexpected response')
  }

  // Now submit the rating to clear the gate
  log('\n=== Submitting rating via POST /rating-exchange/submit ===')
  const r2 = await call('POST', '/rating-exchange/submit', {
    token: tToken,
    body: { exchangeId: String(exchange._id), stars: 5, comment: 'gating-clear test' },
  })
  log(`status=${r2.status}  msg=${r2.data?.message}`)

  // Re-attempt the gated endpoint — should NOT 403 anymore
  log('\n=== Retry gated endpoint, expect to proceed past the gate ===')
  const r3 = await call('POST', '/enquiry', {
    token: tToken,
    body: {
      propertyId: String(property?._id || new mongoose.Types.ObjectId()),
      roomId: String(new mongoose.Types.ObjectId()),
      ownerId: String(owner._id),
      tenantName: 'Smoke Tenant',
      tenantPhone: '9999999999',
      propertyName: 'Smoke Property',
      enquiredBy: String(tenant._id),
    },
  })
  log(`status=${r3.status}  requiresRating=${r3.data?.requiresRating}  msg=${r3.data?.message}`)
  if (r3.status !== 403 || r3.data?.requiresRating !== true) {
    log('  ✓ PASS — gate cleared (any non-403-with-requiresRating response means the middleware let it pass)')
  } else {
    log('  ⚠️  gate still blocking')
  }

  // Cleanup the fake agreement + exchange
  await rentalAgreementModel.deleteOne({ _id: fakeAgreement._id })
  await ratingExchangeModel.deleteOne({ _id: exchange._id })

  await mongoose.disconnect()
  log('\nDone.')
  process.exit(0)
}

main().catch(err => {
  console.error('[GATE] fatal:', err)
  process.exit(1)
})
