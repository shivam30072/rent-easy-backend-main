export const SIGNAL_TYPES = Object.freeze({
  // Tenant signals
  RENT_PAID_ON_TIME: 'rent_paid_on_time',
  RENT_PAID_LATE: 'rent_paid_late',
  AGREEMENT_COMPLETED: 'agreement_completed',
  AGREEMENT_TERMINATED_EARLY: 'agreement_terminated_early',
  OWNER_RATING_RECEIVED: 'owner_rating_received',
  // Owner signals
  MAINTENANCE_ACCEPTED: 'maintenance_accepted',
  MAINTENANCE_REJECTED: 'maintenance_rejected',
  MAINTENANCE_COMPLETED: 'maintenance_completed',
  AGREEMENT_SIGNED_PROMPTLY: 'agreement_signed_promptly',
  AGREEMENT_TERMINATED_BY_OWNER: 'agreement_terminated_by_owner',
  TENANT_RATING_RECEIVED: 'tenant_rating_received',
  BANK_VERIFIED: 'bank_verified',
  PROPERTY_RATING_UPDATED: 'property_rating_updated',
  // Both
  KYC_VERIFIED: 'kyc_verified',
  PROFILE_COMPLETED: 'profile_completed',          // legacy — kept in enum for existing DB rows; new flow uses the two granular signals below
  PROFILE_BASIC_ADDED: 'profile_basic_added',      // name + phone present
  PROFILE_PHOTO_ADDED: 'profile_photo_added',      // profileUrl present
  FORFEITED_RATING: 'forfeited_rating',
})

export const SIGNAL_STATUS = Object.freeze({
  ACTIVE: 'active',
  DISPUTED: 'disputed',
  INVALIDATED: 'invalidated',
})

export const ROLES = Object.freeze({
  TENANT: 'tenant',
  OWNER: 'owner',
})
