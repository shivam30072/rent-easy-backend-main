import { mongoose } from '../../helper/index.js'
import {
  GENDER_OPTIONS,
  PROFESSION_OPTIONS,
  RELIGION_OPTIONS,
  LIFESTYLE_OPTIONS,
} from './PartnerListing.Constant.js'

const partnerListingSchema = new mongoose.Schema({
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Room details
  roomType: { type: String, enum: ['private', 'shared'], required: true },
  totalOccupancy: { type: Number, required: true, min: 1 },
  availableSlots: { type: Number, required: true, min: 1 },
  rentAmount: { type: Number, required: true, min: 0 },
  rentSplitType: { type: String, enum: ['equal', 'fixed'], required: true },
  securityDeposit: { type: Number, default: 0 },
  availabilityDate: { type: Date, required: true },
  description: { type: String, required: true },
  images: { type: [String], default: [] },
  amenities: { type: [String], default: [] },

  // Light location
  city: { type: String, required: true },
  locality: { type: String, required: true },
  pincode: { type: String },
  coordinates: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },

  // Owner preferences
  preferences: {
    gender: { type: String, enum: GENDER_OPTIONS },
    profession: { type: String, enum: PROFESSION_OPTIONS },
    religion: [{ type: String, enum: RELIGION_OPTIONS }],
    ageRange: {
      min: { type: Number },
      max: { type: Number },
    },
    smoking: { type: String, enum: LIFESTYLE_OPTIONS, default: 'no_preference' },
    drinking: { type: String, enum: LIFESTYLE_OPTIONS, default: 'no_preference' },
    pets: { type: String, enum: LIFESTYLE_OPTIONS, default: 'no_preference' },
  },

  linkedProfile: { type: mongoose.Schema.Types.ObjectId, ref: 'PartnerProfile' },
  pulseMode: {
    active: { type: Boolean, default: false },
    expiresAt: { type: Date },
  },
  trialOpen: { type: Boolean, default: false },
  overridePreferences: {
    gender: { type: String, enum: GENDER_OPTIONS },
    profession: { type: String, enum: PROFESSION_OPTIONS },
    religion: [{ type: String, enum: RELIGION_OPTIONS }],
    ageRange: { min: Number, max: Number },
    smoking: { type: String, enum: LIFESTYLE_OPTIONS },
    drinking: { type: String, enum: LIFESTYLE_OPTIONS },
    pets: { type: String, enum: LIFESTYLE_OPTIONS },
  },

  status: { type: String, enum: ['active', 'closed', 'expired'], default: 'active' },
}, { timestamps: true })

partnerListingSchema.index({ city: 1 })
partnerListingSchema.index({ locality: 1 })
partnerListingSchema.index({ status: 1 })
partnerListingSchema.index({ rentAmount: 1 })
partnerListingSchema.index({ 'preferences.gender': 1 })
partnerListingSchema.index({ 'preferences.profession': 1 })
partnerListingSchema.index({ createdBy: 1 })
partnerListingSchema.index({ 'coordinates.lat': 1, 'coordinates.lng': 1 })

partnerListingSchema.set('toJSON', { virtuals: true })
partnerListingSchema.set('toObject', { virtuals: true })

const partnerListingModel = mongoose.model('PartnerListing', partnerListingSchema)

export { partnerListingSchema, partnerListingModel }
