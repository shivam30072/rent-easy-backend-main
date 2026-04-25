export const DISPUTE_STATUS = Object.freeze({
  OPEN: 'open',
  UPHELD: 'upheld',
  REJECTED: 'rejected',
})

export const DISPUTE_WINDOW_DAYS = 7
export const DISPUTE_ABUSE_THRESHOLD = 3        // rejected disputes
export const DISPUTE_ABUSE_WINDOW_DAYS = 365    // ...within this many days

export const DISPUTE_MESSAGES = Object.freeze({
  RAISED: 'Dispute raised — review pending',
  RESOLVED: 'Dispute resolved',
  ALREADY_RAISED: 'You have already disputed this signal',
  WINDOW_PASSED: 'Dispute window has passed (7 days from rating publication)',
  NOT_YOUR_SIGNAL: 'You can only dispute signals that affect your own score',
  SIGNAL_NOT_FOUND: 'Reputation signal not found',
  DISPUTE_NOT_FOUND: 'Dispute not found',
  BAD_INPUT: 'signalId and reason are required',
  ADMIN_BAD_DECISION: "decision must be 'upheld' or 'rejected'",
  FETCHED: 'Disputes fetched',
})
