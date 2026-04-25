// Smoke test for the full Reputation Score feature (Plans 1-4).
//
// What it does:
//   1. Cleans up any prior smoke-test data (users with email prefix `repsmoke-`)
//   2. Creates a tenant + owner test pair (no auth — direct DB creation)
//   3. Verifies eager ReputationScore creation (Plan 1)
//   4. Triggers KYC + profile + bank signals via UserModel/OwnerModel updates (Plan 1)
//   5. Creates property + room + active agreement
//   6. Marks a RentPayment as paid → fires rent_paid_on_time signal (Plan 1)
//   7. Opens a RatingExchange for the agreement (Plan 3 — direct, bypassing cron)
//   8. Submits ratings from both sides → fires *_rating_received signals (Plan 3)
//   9. Tenant raises a dispute on the received owner-rating (Plan 4)
//  10. Admin resolves dispute (rejected) → signal returns to active (Plan 4)
//  11. Terminates the agreement → fires agreement_terminated_early signal (Plan 4)
//  12. Polls scores between steps so the running server's worker can recompute
//
// Pre-req: backend server (with the new code) must be running so the Bull worker processes recompute jobs.
// Re-running this is idempotent — the cleanup at top removes prior test artifacts.

import 'dotenv/config'
import mongoose from 'mongoose'

import { userModel } from '../resources/User/User.Schema.js'
import { ownerModel } from '../resources/Owner/Owner.Schema.js'
import { propertyModel } from '../resources/Property/Property.Schema.js'
import { roomModel } from '../resources/Room/Room.Schema.js'
import { rentalAgreementModel } from '../resources/RentalAgreement/RentalAgreement.Schema.js'
import { rentPaymentModel } from '../resources/RentPayment/RentPayment.Schema.js'
import { reputationSignalModel } from '../resources/ReputationSignal/ReputationSignal.Schema.js'
import { reputationScoreModel } from '../resources/ReputationScore/ReputationScore.Schema.js'
import { ratingExchangeModel } from '../resources/RatingExchange/RatingExchange.Schema.js'
import { disputeModel } from '../resources/Dispute/Dispute.Schema.js'

import RentPaymentModel from '../resources/RentPayment/RentPayment.Model.js'
import OwnerModel from '../resources/Owner/Owner.Model.js'
import UserModel from '../resources/User/User.Model.js'
import RentalAgreementModel from '../resources/RentalAgreement/RentalAgreement.Model.js'
import RatingExchangeModel from '../resources/RatingExchange/RatingExchange.Model.js'
import DisputeModel from '../resources/Dispute/Dispute.Model.js'

import { ensureReputationScoreDocs } from '../services/reputation.service.js'

const SMOKE_PREFIX = 'repsmoke-'
const PASS_HASH = '$2b$10$abcdefghijklmnopqrstuv1234567890wxyzABCDEFGHIJKLMNOPQRS' // dummy bcrypt-shape
const log = (...args) => console.log('[SMOKE]', ...args)
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

async function fetchScore(userId, role) {
  return reputationScoreModel.findOne({ userId, role }).lean()
}

async function pollScoreChange(userId, role, prevScore, timeoutMs = 8000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const doc = await fetchScore(userId, role)
    if (doc && doc.score !== prevScore) return doc
    await sleep(400)
  }
  return fetchScore(userId, role)
}

async function cleanupPriorSmokeData() {
  log('Cleanup: removing any prior repsmoke-* artifacts')
  const priorUsers = await userModel.find({ email: { $regex: `^${SMOKE_PREFIX}` } }, { _id: 1 }).lean()
  const priorUserIds = priorUsers.map(u => u._id)
  if (priorUserIds.length === 0) {
    log('  (no prior data)')
    return
  }
  const priorOwners = await ownerModel.find({ userId: { $in: priorUserIds } }, { _id: 1 }).lean()
  const priorOwnerIds = priorOwners.map(o => o._id)
  const priorAgreements = await rentalAgreementModel.find({
    $or: [{ userId: { $in: priorUserIds } }, { ownerId: { $in: priorUserIds } }],
  }, { _id: 1 }).lean()
  const priorAgreementIds = priorAgreements.map(a => a._id)
  const priorProperties = await propertyModel.find({ ownerId: { $in: priorOwnerIds } }, { _id: 1 }).lean()
  const priorPropertyIds = priorProperties.map(p => p._id)
  const priorSignals = await reputationSignalModel.find({ userId: { $in: priorUserIds } }, { _id: 1 }).lean()
  const priorSignalIds = priorSignals.map(s => s._id)

  const counts = {
    users: await userModel.deleteMany({ _id: { $in: priorUserIds } }),
    owners: await ownerModel.deleteMany({ _id: { $in: priorOwnerIds } }),
    properties: await propertyModel.deleteMany({ _id: { $in: priorPropertyIds } }),
    rooms: await roomModel.deleteMany({ propertyId: { $in: priorPropertyIds } }),
    agreements: await rentalAgreementModel.deleteMany({ _id: { $in: priorAgreementIds } }),
    payments: await rentPaymentModel.deleteMany({ agreementId: { $in: priorAgreementIds } }),
    signals: await reputationSignalModel.deleteMany({ _id: { $in: priorSignalIds } }),
    scores: await reputationScoreModel.deleteMany({ userId: { $in: priorUserIds } }),
    exchanges: await ratingExchangeModel.deleteMany({ agreementId: { $in: priorAgreementIds } }),
    disputes: await disputeModel.deleteMany({ signalId: { $in: priorSignalIds } }),
  }
  for (const [k, r] of Object.entries(counts)) log(`  deleted ${k}:`, r.deletedCount)
}

async function main() {
  log(`Connecting to mongo (${process.env.MONGO_URI?.slice(0, 40)}...)`)
  await mongoose.connect(process.env.MONGO_URI)
  log('Connected')

  await cleanupPriorSmokeData()

  // ── Step 2: Create test users ───────────────────────────────────────
  log('Step 2: creating test users')
  const tenant = await userModel.create({
    name: 'Smoke Tenant',
    email: `${SMOKE_PREFIX}tenant@example.com`,
    phone: `99000${Date.now() % 100000}`.slice(0, 10),
    passwordHash: PASS_HASH,
    role: 'tenant',
    kycVerified: false,
  })
  const owner = await userModel.create({
    name: 'Smoke Owner',
    email: `${SMOKE_PREFIX}owner@example.com`,
    phone: `88000${Date.now() % 100000}`.slice(0, 10),
    passwordHash: PASS_HASH,
    role: 'owner',
    kycVerified: false,
  })
  const adminUser = await userModel.create({
    name: 'Smoke Admin',
    email: `${SMOKE_PREFIX}admin@example.com`,
    phone: `77000${Date.now() % 100000}`.slice(0, 10),
    passwordHash: PASS_HASH,
    role: 'admin',
    kycVerified: true,
  })
  log(`  tenant=${tenant._id}  owner=${owner._id}  admin=${adminUser._id}`)

  // Create Owner doc for the owner user (without bank details initially)
  const ownerDoc = await OwnerModel.createOwner({ userId: owner._id, ownedProperties: [] })
  log(`  ownerDoc._id=${ownerDoc._id}`)

  // ── Step 3: Verify eager ReputationScore creation ───────────────────
  // Hooks in User.Model.registerUserService fire ensureReputationScoreDocs but
  // we used userModel.create directly so we have to call it manually here.
  await ensureReputationScoreDocs(tenant._id)
  await ensureReputationScoreDocs(owner._id)
  await sleep(500)
  const tScore0 = await fetchScore(tenant._id, 'tenant')
  const oScore0 = await fetchScore(owner._id, 'owner')
  log(`Step 3: base scores  tenant=${tScore0?.score}/${tScore0?.tier}  owner=${oScore0?.score}/${oScore0?.tier}`)
  if (tScore0?.score !== 500 || oScore0?.score !== 500) {
    log('  ⚠️  expected 500 baseline but got something else')
  }

  // ── Step 4: KYC + profile + bank signals ────────────────────────────
  log('Step 4: triggering KYC/profile/bank signals')
  await UserModel.updateUser(tenant._id, {
    name: 'Smoke Tenant Fullname',
    phone: tenant.phone,
    profileUrl: 'https://example.com/avatar.jpg',
    kycVerified: true,
  })
  await UserModel.updateUser(owner._id, {
    name: 'Smoke Owner Fullname',
    phone: owner.phone,
    profileUrl: 'https://example.com/avatar.jpg',
    kycVerified: true,
  })
  await OwnerModel.updateOwner(ownerDoc._id, {
    bankDetails: {
      accountHolderName: 'Smoke Owner Fullname',
      accountNumber: '12345678901',
      ifsc: 'HDFC0001234',
    },
  })
  log('  waiting up to 8s for worker to recompute...')
  const tScore1 = await pollScoreChange(tenant._id, 'tenant', tScore0.score)
  const oScore1 = await pollScoreChange(owner._id, 'owner', oScore0.score)
  log(`  after onboarding:  tenant=${tScore1?.score}/${tScore1?.tier}  owner=${oScore1?.score}/${oScore1?.tier}`)
  // Expected (per weights): tenant ~580 (KYC+profile = +80), owner ~620 (KYC+profile+bank = +120)
  log(`  expected:           tenant ~580 (fair)            owner ~620 (good)`)

  // ── Step 5: Property + Room + Agreement ─────────────────────────────
  log('Step 5: creating property + room + agreement')
  const property = await propertyModel.create({
    ownerId: ownerDoc._id,
    addressId: new mongoose.Types.ObjectId(),
    propertyName: 'Smoke Property',
    propertyType: 'flat',
    description: 'For smoke testing only — safe to delete',
    bhkType: '2BHK',
    size: 1000,
    floor: 2,
    totalFloors: 5,
    availableFrom: new Date(),
    furnishing: 'semi-furnished',
    parking: false,
    features: ['ac', 'lift'],
    images: [],
    rating: 0,
    minAmount: 15000,
    maxAmount: 15000,
    uniquePropertyCode: `SMOKE-${Date.now()}`,
    isActive: true,
    isArchived: false,
  })
  const room = await roomModel.create({
    propertyId: property._id,
    addressId: property.addressId,
    roomNumber: '101',
    roomType: 'Single',
    rent: 15000,
    rentDueDay: 5,
    securityDeposit: { months: 1 },
    isAvailable: true,
    images: [],
    rating: 0,
  })
  const agreement = await rentalAgreementModel.create({
    roomId: room._id,
    propertyId: property._id,
    userId: tenant._id,
    ownerId: owner._id,
    agreementStartDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    agreementEndDate: new Date(Date.now() + 11 * 30 * 24 * 60 * 60 * 1000),
    rentAmount: 15000,
    securityDeposit: 15000,
    status: 'active',
    isActive: true,
    paymentSchedule: { frequency: 'monthly', dueDay: 5, penaltyBufferDays: 5, penaltyAmount: 500 },
  })
  log(`  property=${property._id}  room=${room._id}  agreement=${agreement._id}`)

  // ── Step 6: Mark a RentPayment as paid → fire rent_paid_on_time signal ─
  log('Step 6: creating a paid RentPayment (on-time)')
  const dueDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
  const paidDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
  await RentPaymentModel.createRentPayment({
    agreementId: agreement._id,
    userId: tenant._id,
    ownerId: ownerDoc._id,
    month: dueDate.getMonth() + 1,
    year: dueDate.getFullYear(),
    paymentDate: paidDate,
    dueDate,
    amountPaid: 15000,
    paymentMode: 'UPI',
  })
  log('  waiting for worker...')
  const tScore2 = await pollScoreChange(tenant._id, 'tenant', tScore1.score)
  log(`  tenant score after rent-paid-on-time: ${tScore2?.score}/${tScore2?.tier}`)

  // ── Step 7-8: Open RatingExchange + submit both sides ───────────────
  log('Step 7: opening RatingExchange (bypassing cron)')
  const exchange = await RatingExchangeModel.openWindowForAgreement(agreement.toObject())
  log(`  exchange=${exchange._id}  deadline=${exchange.deadline.toISOString()}`)

  log('Step 8: tenant submits 5-star rating about owner')
  await RatingExchangeModel.submitRatingService({
    exchangeId: exchange._id,
    userId: tenant._id,
    stars: 5,
    comment: 'Great owner, very responsive.',
  })

  log('Step 8: owner submits 4-star rating about tenant')
  await RatingExchangeModel.submitRatingService({
    exchangeId: exchange._id,
    userId: owner._id,
    stars: 4,
    comment: 'Reliable tenant.',
  })
  log('  waiting for both signals to fire + worker to recompute...')
  await sleep(3000)
  const tScore3 = await fetchScore(tenant._id, 'tenant')
  const oScore3 = await fetchScore(owner._id, 'owner')
  log(`  tenant after owner-rating-received(5★ → +50): ${tScore3?.score}/${tScore3?.tier}`)
  log(`  owner  after tenant-rating-received(4★ → +25): ${oScore3?.score}/${oScore3?.tier}`)

  // ── Step 9-10: Dispute the rating, then admin rejects ──────────────
  log('Step 9: tenant disputes the owner-rating signal')
  const ownerRatingSignal = await reputationSignalModel.findOne({
    userId: tenant._id,
    role: 'tenant',
    signalType: 'owner_rating_received',
    'sourceRef.id': exchange._id,
  })
  if (!ownerRatingSignal) {
    log('  ⚠️  could not find the owner-rating signal to dispute')
  } else {
    log(`  signalId=${ownerRatingSignal._id}  current status=${ownerRatingSignal.status}`)
    const dispute = await DisputeModel.raiseDisputeService({
      signalId: ownerRatingSignal._id,
      raisedByUserId: tenant._id,
      reason: 'Smoke-test dispute — disputing the owner rating.',
    })
    log(`  dispute=${dispute._id}  status=${dispute.status}`)
    await sleep(2500)
    const tScoreAfterDispute = await fetchScore(tenant._id, 'tenant')
    log(`  tenant score with signal disputed (excluded): ${tScoreAfterDispute?.score}/${tScoreAfterDispute?.tier}`)

    log('Step 10: admin REJECTS the dispute (signal returns to active)')
    await DisputeModel.resolveDisputeService({
      disputeId: dispute._id,
      decision: 'rejected',
      adminNote: 'Smoke-test admin rejection',
    })
    await sleep(2500)
    const tScoreAfterReject = await fetchScore(tenant._id, 'tenant')
    log(`  tenant score after dispute rejected (signal back): ${tScoreAfterReject?.score}/${tScoreAfterReject?.tier}`)

    const refreshedSignal = await reputationSignalModel.findById(ownerRatingSignal._id).lean()
    log(`  signal status now: ${refreshedSignal?.status} (expected: active)`)
  }

  // ── Step 11: Terminate the agreement (tenant initiator) ─────────────
  log('Step 11: tenant terminates the agreement → agreement_terminated_early signal')
  await RentalAgreementModel.terminateRentalAgreement(agreement._id, 'Smoke test', tenant._id)
  await sleep(2500)
  const tScore5 = await fetchScore(tenant._id, 'tenant')
  log(`  tenant score after early termination (-80): ${tScore5?.score}/${tScore5?.tier}`)

  // ── Final summary ────────────────────────────────────────────────────
  log('\n===== FINAL STATE =====')
  const sigs = await reputationSignalModel.find({ userId: { $in: [tenant._id, owner._id] } })
    .sort({ occurredAt: -1 })
    .lean()
  log(`Total signals: ${sigs.length}`)
  for (const s of sigs) {
    log(`  ${String(s.userId).slice(-6)} | ${s.role.padEnd(6)} | ${s.signalType.padEnd(35)} | weight=${String(s.weightedValue).padStart(5)} | status=${s.status}`)
  }

  log('\n===== TEST USER IDs (for further manual testing) =====')
  log(`Tenant: ${tenant._id} (email: ${tenant.email})`)
  log(`Owner:  ${owner._id} (email: ${owner.email})`)
  log(`Admin:  ${adminUser._id} (email: ${adminUser.email})`)
  log(`Agreement: ${agreement._id}`)
  log(`To clean up later, re-run this script (it cleans up its own data first).`)

  await mongoose.disconnect()
  log('Done.')
  process.exit(0)
}

main().catch(err => {
  console.error('[SMOKE] fatal:', err)
  process.exit(1)
})
