export const RATING_EXCHANGE_STATUS = Object.freeze({
  PENDING: 'pending',
  BOTH_SUBMITTED: 'both_submitted',
  ONE_FORFEIT: 'one_forfeit',
  BOTH_FORFEIT: 'both_forfeit',
  CLOSED: 'closed',
})

export const RATING_WINDOW_DAYS = 14

export const RATING_EXCHANGE_MESSAGES = Object.freeze({
  SUBMITTED: 'Rating submitted',
  ALREADY_SUBMITTED: 'You have already submitted your rating for this rental',
  PENDING_FETCHED: 'Pending rating exchanges fetched',
  PUBLISHED_FETCHED: 'Published ratings fetched',
  NOT_FOUND: 'Rating exchange not found',
  NOT_PARTICIPANT: 'You are not a participant of this rating exchange',
  WINDOW_CLOSED: 'The rating window for this rental is no longer open',
  BAD_INPUT: 'exchangeId, stars (1-5) are required',
})
