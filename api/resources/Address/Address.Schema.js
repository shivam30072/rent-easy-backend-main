import { mongoose } from "../../helper/index.js"

const mongooseObject = {
  addressId: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  state: String,
  city: String,
  pincode: String,
  fullAddress: String,
  geoLocation: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point"
    },
    coordinates: {
      type: [Number],
      required: true
    }
  }
}

const mongooseOptions = { timestamps: true }

const addressSchema = new mongoose.Schema(mongooseObject, mongooseOptions)
addressSchema.index({ geoLocation: "2dsphere" })

addressSchema.set('toJSON', { virtuals: true })
addressSchema.set('toObject', { virtuals: true })

const addressModel = mongoose.model("Address", addressSchema)

export { addressSchema, addressModel }
