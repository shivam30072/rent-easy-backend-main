export const PAYMENT_STATUS = {
  PAID: 'paid',
  PENDING: 'pending',
  LATE: 'late'
}

export const PAYMENT_MODE = {
  UPI: 'UPI',
  NET_BANKING: 'NetBanking',
  WALLET: 'Wallet',
  ONLINE: 'Online'
}

export const PLATFORM_FEE_PCT = Number(process.env.PLATFORM_FEE_PCT || 0.015)

export const RENTPAYMENT_MESSAGES = {
  CREATED: 'Payment created',
  FETCHED: 'Payments fetched',
  NOT_FOUND: 'Payment not found',
  DELETED: 'Payment deleted',
  FETCH_PAYMENT_BREAKUP: 'Payment breakup fetched',
  ORDER_CREATED: 'Order created',
  VERIFIED: 'Payment verified',
  INVALID_SIGNATURE: 'Invalid payment signature'
}
