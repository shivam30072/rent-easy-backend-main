import { mongoose } from '../../helper/index.js'
import {
  SLEEP_SCHEDULES, CLEANLINESS_LEVELS, SMOKING_OPTIONS, DRINKING_OPTIONS,
  DIET_OPTIONS, PET_OPTIONS, NOISE_LEVELS, ROOM_TYPE_OPTIONS,
  HOSTING_STYLES, WFH_OPTIONS, SHARING_STYLES, ANCHOR_TYPES,
  DEALBREAKER_TAGS, BOOSTABLE_DIMENSIONS,
} from './PartnerProfile.Constant.js'

const partnerProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },

  // Phase 1 — required
  basics: {
    displayName: { type: String, required: true },
    age: { type: Number, required: true, min: 18, max: 80 },
    gender: { type: String, enum: ['male', 'female', 'other'], required: true },
    profession: { type: String, enum: ['student', 'working_professional', 'other'], required: true },
    photos: { type: [String], default: [] },
  },
  budget: {
    rentMin: { type: Number, required: true, min: 0 },
    rentMax: { type: Number, required: true, min: 0 },
    depositMax: { type: Number, default: 0 },
  },
  moveIn: {
    earliest: { type: Date, required: true },
    latest: { type: Date, required: true },
    flexible: { type: Boolean, default: false },
  },
  location: {
    preferredCity: { type: String, required: true, trim: true },
    preferredLocalities: { type: [String], default: [] },
    gpsCoords: {
      lat: { type: Number },
      lng: { type: Number },
    },
    radiusKm: { type: Number, default: 5, min: 1, max: 25 },
    anchorType: { type: String, enum: ANCHOR_TYPES, default: 'gps' },
  },
  // Set by MatchScore.recomputeAllForProfile when this profile's pairwise
  // scores were last (re)computed. Null/absent => never computed (cold start).
  matchScoresComputedAt: { type: Date },
  roomType: { type: String, enum: ROOM_TYPE_OPTIONS, required: true },
  lifestyle: {
    sleepSchedule: { type: String, enum: SLEEP_SCHEDULES, required: true },
    cleanliness: { type: String, enum: CLEANLINESS_LEVELS, required: true },
    smoking: { type: String, enum: SMOKING_OPTIONS, required: true },
    drinking: { type: String, enum: DRINKING_OPTIONS, required: true },
    diet: { type: String, enum: DIET_OPTIONS, required: true },
    pets: { type: String, enum: PET_OPTIONS, required: true },
    noiseLevel: { type: String, enum: NOISE_LEVELS, required: true },
  },
  dealbreakers: {
    type: [{ type: String, enum: DEALBREAKER_TAGS }],
    validate: {
      validator: arr => arr.length === 3,
      message: 'Exactly 3 dealbreakers required.',
    },
  },

  // Phase 2 — optional
  personality: {
    introExtroScale: { type: Number, min: 1, max: 5 },
    wfh: { type: String, enum: WFH_OPTIONS },
    hostingStyle: { type: String, enum: HOSTING_STYLES },
    sharingStyle: { type: String, enum: SHARING_STYLES },
  },
  interests: { type: [String], default: [] },
  prompts: [{
    promptId: { type: String, required: true },
    answer: { type: String, required: true },
    mediaUrl: { type: String },
  }],
  voiceIntro: {
    url: { type: String },
    durationSec: { type: Number, max: 30 },
  },
  schedule: {
    week: { type: [[String]], default: undefined }, // 7×24 grid, optional
  },
  weightBoosts: {
    type: [{ type: String, enum: BOOSTABLE_DIMENSIONS }],
    validate: {
      validator: arr => arr.length <= 2,
      message: 'At most 2 weight boosts allowed.',
    },
    default: [],
  },

  // System
  completionScore: { type: Number, default: 0, min: 0, max: 100 },
  pulseMode: {
    active: { type: Boolean, default: false },
    expiresAt: { type: Date },
  },
  lastActiveAt: { type: Date, default: Date.now },
}, { timestamps: true })

partnerProfileSchema.index({ 'location.gpsCoords.lat': 1, 'location.gpsCoords.lng': 1 })
partnerProfileSchema.index({ 'pulseMode.active': 1, 'pulseMode.expiresAt': 1 })
partnerProfileSchema.index({ 'lifestyle.sleepSchedule': 1 })
partnerProfileSchema.index({ lastActiveAt: -1 })

partnerProfileSchema.set('toJSON', { virtuals: true })
partnerProfileSchema.set('toObject', { virtuals: true })

const partnerProfileModel = mongoose.model('PartnerProfile', partnerProfileSchema)

export { partnerProfileSchema, partnerProfileModel }
