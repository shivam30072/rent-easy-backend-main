const PARTNER_LISTING_MESSAGES = {
  CREATED: 'Partner listing created successfully.',
  UPDATED: 'Partner listing updated successfully.',
  FETCHED: 'Partner listings fetched successfully.',
  CLOSED: 'Partner listing closed successfully.',
  NOT_FOUND: 'Partner listing not found.',
  NOT_AUTHORIZED: 'You are not authorized to perform this action.',
  ALREADY_CLOSED: 'This listing is already closed.',
}

const ROOM_TYPES = {
  PRIVATE: 'private',
  SHARED: 'shared',
}

const RENT_SPLIT_TYPES = {
  EQUAL: 'equal',
  FIXED: 'fixed',
}

const LISTING_STATUS = {
  ACTIVE: 'active',
  CLOSED: 'closed',
  EXPIRED: 'expired',
}

const GENDER_OPTIONS = ['male', 'female', 'any']
const PROFESSION_OPTIONS = ['student', 'working_professional', 'any']
const RELIGION_OPTIONS = ['hindu', 'muslim', 'christian', 'sikh', 'buddhist', 'jain', 'other', 'no_preference']
const LIFESTYLE_OPTIONS = ['yes', 'no', 'no_preference']

export {
  PARTNER_LISTING_MESSAGES,
  ROOM_TYPES,
  RENT_SPLIT_TYPES,
  LISTING_STATUS,
  GENDER_OPTIONS,
  PROFESSION_OPTIONS,
  RELIGION_OPTIONS,
  LIFESTYLE_OPTIONS,
}
