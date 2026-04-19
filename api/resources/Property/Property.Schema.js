import { mongoose } from "../../helper/index.js"

const mongooseObject = {
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  addressId: { type: mongoose.Schema.Types.ObjectId, ref: "Address", required: true },
  description: String,
  propertyName: { type: String, required: true, index: true },
  propertyType: { type: String, enum: ["flat", "villa", "independent_house", "other"], required: true },
  bhkType: String,
  size: Number,
  floor: Number,
  totalFloors: Number,
  availableFrom: Date,
  preferredTenant: String,
  parking: { type: Boolean, default: false },
  features: [{ type: String, index: true }], // e.g., "ac","lift","security"
  images: [{ type: String }],
  isActive: { type: Boolean, default: true, index: true },
  isArchived: { type: Boolean, default: false, index: true },
  highlights: { type: [String], default: [] },
  uniquePropertyCode: { type: String, unique: true, required: true, index: true },
  furnishing: {
    type: String,
    enum: ['unfurnished', 'semi-furnished', 'fully-furnished'],
    default: 'unfurnished',
    index: true,
  },
  rating: { type: Number, min: 0, max: 5, default: 0, index: true },
  minAmount: { type: Number, default: null, index: true },
  maxAmount: { type: Number, default: null, index: true },

  deletedAt: { type: Date, default: null, index: true },
}

const mongooseOptions = { timestamps: true }

const propertySchema = new mongoose.Schema(mongooseObject, mongooseOptions)

// Text index for search
propertySchema.index({
  propertyName: 'text',
  description: 'text',
  'addressSnapshot.city': 'text',
  'addressSnapshot.state': 'text',
  'addressSnapshot.locality': 'text',
  highlights: 'text',
  features: 'text',
}, { name: 'PropertyTextIndex', weights: { propertyName: 5, highlights: 3, description: 2 } })

// ✅ Virtual relationship with Room
propertySchema.virtual('rooms', {
  ref: 'Room', // model name
  localField: '_id',
  foreignField: 'propertyId',
})

// Helper: markDeleted hook for safety (not enforced used by model)
propertySchema.methods.softDelete = function () {
  this.deletedAt = new Date()
  this.isActive = false
  return this.save()
}

// Hide internal fields in lean (optional)
propertySchema.set('toJSON', { virtuals: true })
propertySchema.set('toObject', { virtuals: true })

const propertyModel = mongoose.model("Property", propertySchema)

export { propertySchema, propertyModel }
