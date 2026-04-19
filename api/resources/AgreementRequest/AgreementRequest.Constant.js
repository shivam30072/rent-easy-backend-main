const AGREEMENT_REQUEST_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined'
}

const AGREEMENT_REQUEST_MESSAGES = {
  CREATED: 'Agreement request sent successfully.',
  FETCHED: 'Agreement request status fetched.',
  ACCEPTED: 'Agreement request accepted.',
  DECLINED: 'Agreement request declined.',
  ALREADY_REQUESTED: 'You have already sent a request for this property recently. Please wait before sending again.',
  ALREADY_ACCEPTED: 'This agreement request has already been accepted.',
  NOT_FOUND: 'Agreement request not found.'
}

export { AGREEMENT_REQUEST_STATUS, AGREEMENT_REQUEST_MESSAGES }