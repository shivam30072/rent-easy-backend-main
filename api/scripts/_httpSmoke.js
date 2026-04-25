// HTTP smoke test against the running server.
// Generates JWTs for the smoke users via the existing jwt helper, then exercises endpoints.

import 'dotenv/config'
import mongoose from 'mongoose'
import { userModel } from '../resources/User/User.Schema.js'
import { generateToken } from '../helper/jwtHelper.js'

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

const log = (...args) => console.log('[HTTP]', ...args)

async function main() {
  await mongoose.connect(process.env.MONGO_URI)
  const tenant = await userModel.findOne({ email: 'repsmoke-tenant@example.com' }).lean()
  const owner = await userModel.findOne({ email: 'repsmoke-owner@example.com' }).lean()
  const admin = await userModel.findOne({ email: 'repsmoke-admin@example.com' }).lean()
  log(`Tenant ${tenant?._id}, Owner ${owner?._id}, Admin ${admin?._id}`)

  const { accessToken: tToken } = await generateToken(tenant._id)
  const { accessToken: oToken } = await generateToken(owner._id)
  const { accessToken: aToken } = await generateToken(admin._id)
  log('JWTs minted')

  // ── Plan 1: read endpoints ──
  log('\n=== Plan 1: reputation reads ===')
  let r = await call('POST', '/reputation/getScore', { body: { userId: String(tenant._id), role: 'tenant' } })
  log(`POST /reputation/getScore (tenant) → ${r.status}  score=${r.data?.data?.score} tier=${r.data?.data?.tier}`)

  r = await call('POST', '/reputation/getScore', { body: { userId: String(owner._id), role: 'owner' } })
  log(`POST /reputation/getScore (owner)  → ${r.status}  score=${r.data?.data?.score} tier=${r.data?.data?.tier}`)

  r = await call('POST', '/reputation/getMultipleScores', {
    body: { userIds: [String(tenant._id), String(owner._id)], role: 'owner' },
  })
  log(`POST /reputation/getMultipleScores (role=owner) → ${r.status}  results=${JSON.stringify(r.data?.data)}`)

  r = await call('POST', '/reputation/getBreakdown', {
    token: tToken,
    body: { userId: String(tenant._id), role: 'tenant' },
  })
  log(`POST /reputation/getBreakdown (own, auth) → ${r.status}  signals=${r.data?.data?.signals?.length}`)

  r = await call('POST', '/reputation/getBreakdown', {
    token: tToken,
    body: { userId: String(owner._id), role: 'owner' },
  })
  log(`POST /reputation/getBreakdown (someone else, expect 403) → ${r.status}  msg=${r.data?.message}`)

  // ── Plan 3: gating + rating exchange reads ──
  log('\n=== Plan 3: rating exchange + gating ===')
  r = await call('GET', '/rating-exchange/pending', { token: tToken })
  log(`GET /rating-exchange/pending (tenant) → ${r.status}  pending count=${r.data?.data?.length}`)

  // Try to create an enquiry while we still have pending exchange (should fail with 403 + requiresRating)
  // First clean up any stale pending exchange so we can simulate the gating cleanly
  // Actually — at this point there should be NO pending exchange because Step 8 had both submit.
  // To exercise gating, let me try to create one

  // ── Plan 4: dispute reads ──
  log('\n=== Plan 4: disputes ===')
  r = await call('GET', '/dispute/mine', { token: tToken })
  log(`GET /dispute/mine (tenant)  → ${r.status}  dispute count=${r.data?.data?.length}`)

  // ── Plan 4 admin endpoints ──
  log('\n=== Plan 4: admin endpoints (admin role) ===')
  r = await call('GET', '/dispute/admin/list', { token: aToken })
  log(`GET /dispute/admin/list   → ${r.status}  total=${r.data?.data?.length}`)

  r = await call('GET', `/reputation/admin/signals?userId=${tenant._id}&role=tenant`, { token: aToken })
  log(`GET /reputation/admin/signals (tenant)   → ${r.status}  signals=${r.data?.data?.length}`)

  r = await call('POST', '/reputation/admin/recompute', {
    token: aToken,
    body: { userId: String(tenant._id), role: 'tenant', reason: 'http_smoke' },
  })
  log(`POST /reputation/admin/recompute   → ${r.status}  ${JSON.stringify(r.data?.data)}`)

  // Same admin endpoint but with non-admin token (expect 403)
  r = await call('GET', '/dispute/admin/list', { token: tToken })
  log(`GET /dispute/admin/list (with tenant token, expect 403) → ${r.status}  msg=${r.data?.message}`)

  await mongoose.disconnect()
  log('\nDone.')
  process.exit(0)
}

main().catch(err => {
  console.error('[HTTP] fatal:', err)
  process.exit(1)
})
