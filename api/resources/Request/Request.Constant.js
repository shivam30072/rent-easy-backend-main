const REQUEST_MESSAGES = {
  CREATED: 'Request created successfully.',
  UPDATED: 'Request updated successfully.',
  DELETED: 'Request deleted successfully.',
  ACCEPTED: 'Request accepted successfully.',
  COMPLETED: 'Request marked as completed successfully.',
  REJECTED: 'Request rejected successfully.',
  FETCHED: 'Requests fetched successfully.'
}

const MESSAGES = {
  NOT_FOUND: 'Request not found',
  NOT_AUTHORIZED: 'You are not authorized to perform this action',
  INVALID_STATUS: 'Invalid request status'
}

const REQUEST_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  COMPLETED: 'completed',
  REJECTED: 'rejected'
}

export { REQUEST_MESSAGES, MESSAGES, REQUEST_STATUS }
