export const PARTNER_PROFILE_MESSAGES = {
  CREATED: 'Partner profile created successfully.',
  UPDATED: 'Partner profile updated successfully.',
  FETCHED: 'Partner profile fetched successfully.',
  NOT_FOUND: 'Partner profile not found.',
  ALREADY_EXISTS: 'You already have a partner profile.',
  NOT_AUTHORIZED: 'You are not authorized to view this profile.',
  INCOMPLETE: 'Phase-1 fields are required to complete onboarding.',
  PULSE_TOGGLED: 'Pulse mode toggled.',
}

export const SLEEP_SCHEDULES = ['early_bird', 'night_owl', 'flexible']
export const CLEANLINESS_LEVELS = ['very_tidy', 'tidy', 'relaxed']
export const SMOKING_OPTIONS = ['yes', 'no', 'occasional']
export const DRINKING_OPTIONS = ['yes', 'no', 'social']
export const DIET_OPTIONS = ['veg', 'non_veg', 'jain', 'vegan', 'eggetarian', 'no_preference']
export const PET_OPTIONS = ['have', 'love', 'allergic', 'no_preference']
export const NOISE_LEVELS = ['quiet', 'moderate', 'lively']
export const ROOM_TYPE_OPTIONS = ['private', 'shared', 'any']
export const HOSTING_STYLES = ['often', 'occasional', 'rarely']
export const WFH_OPTIONS = ['always', 'sometimes', 'never']
export const SHARING_STYLES = ['love_to_share', 'mine_is_mine']
export const ANCHOR_TYPES = ['gps', 'pin']

// Controlled list — exactly 3 must be selected by each user
export const DEALBREAKER_TAGS = [
  'no_smokers',
  'no_drinkers',
  'must_be_veg',
  'no_pets',
  'must_be_quiet',
  'must_match_sleep_schedule',
  'no_overnight_guests',
  'must_be_clean',
  'must_split_chores',
  'no_loud_music',
]

// Dimensions a user can boost (+5 pts each, max 2)
export const BOOSTABLE_DIMENSIONS = [
  'lifestyle',
  'proximity',
  'personality',
  'logistics',
  'interests',
]

export const COMPLETION_PHASE1_FIELDS = [
  'basics.displayName',
  'basics.age',
  'basics.gender',
  'basics.profession',
  'basics.photos',
  'budget.rentMin',
  'budget.rentMax',
  'moveIn.earliest',
  'moveIn.latest',
  'location.preferredCity',
  'location.preferredLocalities',
  'location.gpsCoords',
  'roomType',
  'lifestyle',
  'dealbreakers',
]
