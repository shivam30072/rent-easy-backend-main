import { mongoose } from '../../helper/index.js'

const mongooseObject = {
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
  roomNumber: String,
  roomType: { type: String, enum: ['Single', 'Double', 'Suite', 'Flat', 'Other'], required: true },
  description: String,
  rent: { type: Number, required: true },
  rentDueDay: { type: Number, min: 1, max: 31 },
  maintenanceCharge: {
    amount: { type: Number, default: 0 },
    frequency: { type: String, enum: ['monthly', 'annually'], default: 'monthly' }
  },
  securityDeposit: {
    months: { type: Number, default: 1, min: 1 }
  },
  otherCharges: {
    type: Number, default: 0 
  },
  isAvailable: { type: Boolean, default: true },
  amenities: [String],
  roomSize: String,
  floorNumber: Number,
  images: [String],
  addressId: { type: mongoose.Schema.Types.ObjectId, ref: "Address", required: true },
  rating: { type: Number, min: 0, max: 5, default: 0 },
  rentalHistory: [
    {
      tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      startDate: { type: Date, required: true },
      endDate: { type: Date, default: null }, // null if ongoing
      rentAmount: { type: Number, required: true },
      securityDeposit: { type: Number, default: 0 }
    }
  ]
}

const mongooseOptions = { timestamps: true }

const roomSchema = new mongoose.Schema(mongooseObject, mongooseOptions)

roomSchema.index({ 'address.geoLocation': '2dsphere' })
roomSchema.index({ rent: 1 })
roomSchema.index({ isAvailable: 1 })
roomSchema.index({ propertyId: 1 })

roomSchema.set('toJSON', { virtuals: true })
roomSchema.set('toObject', { virtuals: true })

const roomModel = mongoose.model('Room', roomSchema)

export { roomSchema, roomModel }
