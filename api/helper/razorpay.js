import Razorpay from 'razorpay'
import crypto from 'node:crypto'
import axios from 'axios'

let razorInstance = null
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  })
}

export const createOrder = async ({ amountPaise, currency = 'INR', receipt, notes = {} }) => {
  if (!razorInstance) throw new Error('Razorpay not configured — set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET')
  return razorInstance.orders.create({
    amount: amountPaise,
    currency,
    receipt: receipt || `rcpt_${Date.now()}`,
    payment_capture: 1,
    notes,
  })
}

// Verify signature from Razorpay Checkout success callback.
// Signature = HMAC_SHA256(order_id + "|" + payment_id, key_secret)
export const verifyCheckoutSignature = ({ orderId, paymentId, signature }) => {
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex')
  return expected === signature
}

// Verify X-Razorpay-Signature header on webhook using RAW body string
export const verifyWebhookSignature = (rawBody, signature, secret = process.env.RAZORPAY_WEBHOOK_SECRET) => {
  if (!secret) return false
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  return expected === signature
}

// RazorpayX Payout (IMPS) — requires RAZORPAY_PAYOUT_ACCOUNT_NUMBER (X virtual acc)
// Uses REST directly because `razorpay` SDK does not expose payouts on all versions.
export const createPayoutToBank = async ({
  amountPaise,
  beneficiaryName,
  accountNumber,
  ifsc,
  referenceId,
  narration = 'Rent payout',
  mode = 'IMPS'
}) => {
  const sourceAccount = process.env.RAZORPAY_PAYOUT_ACCOUNT_NUMBER
  if (!sourceAccount) throw new Error('RAZORPAY_PAYOUT_ACCOUNT_NUMBER not configured')

  const keyId = process.env.RAZORPAY_PAYOUT_KEY_ID || process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_PAYOUT_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET

  const body = {
    account_number: sourceAccount,
    amount: amountPaise,
    currency: 'INR',
    mode,
    purpose: 'payout',
    queue_if_low_balance: true,
    reference_id: referenceId || `payout_${Date.now()}`,
    narration,
    fund_account: {
      account_type: 'bank_account',
      bank_account: {
        name: beneficiaryName,
        ifsc,
        account_number: accountNumber
      },
      contact: {
        name: beneficiaryName,
        type: 'vendor'
      }
    }
  }

  const { data } = await axios.post('https://api.razorpay.com/v1/payouts', body, {
    auth: { username: keyId, password: keySecret },
    headers: {
      'Content-Type': 'application/json',
      'X-Payout-Idempotency': body.reference_id
    }
  })
  return data
}

export default razorInstance
