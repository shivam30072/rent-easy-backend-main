import { mongoose } from '../../helper/index.js'

const ratingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  review: { type: String },
  createdAt: { type: Date, default: Date.now }
})

ratingSchema.set('toJSON', { virtuals: true })
ratingSchema.set('toObject', { virtuals: true })

const ratingModel = mongoose.model('Rating', ratingSchema)

export { ratingSchema, ratingModel }