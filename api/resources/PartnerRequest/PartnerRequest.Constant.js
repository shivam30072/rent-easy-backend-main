const PARTNER_REQUEST_MESSAGES = {
  SENT: 'Partner request sent successfully.',
  RESPONDED: 'Partner request updated successfully.',
  FETCHED: 'Partner requests fetched successfully.',
  MATCHES_FETCHED: 'Matches fetched successfully.',
  CONTACT_SHARED: 'Contact info shared successfully.',
  NOT_FOUND: 'Partner request not found.',
  NOT_AUTHORIZED: 'You are not authorized to perform this action.',
  DUPLICATE: 'You have already sent a request for this listing.',
  SELF_REQUEST: 'You cannot send a request to your own listing.',
  LISTING_NOT_ACTIVE: 'This listing is no longer active.',
  ALREADY_RESPONDED: 'This request has already been responded to.',
  NOT_MATCHED: 'You can only share contact info after a match.',
  COOLDOWN: 'You can only send one request per week. Please try again later.',
}

const REQUEST_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
}

export { PARTNER_REQUEST_MESSAGES, REQUEST_STATUS }
