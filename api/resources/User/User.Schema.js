import { mongoose } from '../../helper/index.js' 
import { addressSchema } from '../Address/Address.Schema.js'

const mongooseObject = {
  name: String,
  isProfileVerified: { type: Boolean, default: false },
  profileUrl: { type: String },
  email: { type: String, unique: true },
  phone: { type: String, unique: true, sparse: true },
  passwordHash: String,
  role: { type: String, enum: ['owner', 'tenant', 'admin'], default: null },
  aadhaarNumber: String,
  kycVerified: { type: Boolean, default: false },
  address: addressSchema,
  partnerRole: { type: String, enum: ['owner', 'seeker'], default: null },
  tenantReputationScoreId: { type: mongoose.Schema.Types.ObjectId, ref: 'ReputationScore', default: null },
  ownerReputationScoreId: { type: mongoose.Schema.Types.ObjectId, ref: 'ReputationScore', default: null },
  disputeAbuseFlag: { type: Boolean, default: false },
}

const mongooseOptions = { timestamps: true }

const userSchema = new mongoose.Schema(mongooseObject, mongooseOptions)

userSchema.index({ "address.geoLocation": "2dsphere" })

userSchema.set('toJSON', { virtuals: true })
userSchema.set('toObject', { virtuals: true })

const userModel = mongoose.model("User", userSchema)

export { userSchema, userModel }