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
    lat: { type: Number },
    lng: { type: Number },
  },

  // Owner preferences
  preferences: {
    gender: { type: String, enum: GENDER_OPTIONS, required: true },
    profession: { type: String, enum: PROFESSION_OPTIONS, required: true },
    religion: [{ type: String, enum: RELIGION_OPTIONS }],
    ageRange: {
      min: { type: Number },
      max: { type: Number },
    },
    smoking: { type: String, enum: LIFESTYLE_OPTIONS, default: 'no_preference' },
    drinking: { type: String, enum: LIFESTYLE_OPTIONS, default: 'no_preference' },
    pets: { type: String, enum: LIFESTYLE_OPTIONS, default: 'no_preference' },
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

partnerListingSchema.set('toJSON', { virtuals: true })
partnerListingSchema.set('toObject', { virtuals: true })

const partnerListingModel = mongoose.model('PartnerListing', partnerListingSchema)

export { partnerListingSchema, partnerListingModel }
