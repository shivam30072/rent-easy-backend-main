import { mongoose } from '../../helper/index.js'

const homeBannerSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, trim: true },
  roles: {
    type: [String],
    enum: ['tenant', 'owner', 'admin', 'all'],
    default: ['all'],
    index: true,
  },
  eyebrow: { type: String, default: 'Announcement' },
  title: { type: String, required: true },
  message: { type: String, default: '' },
  icon: { type: String, default: 'megaphone' },
  imageUrl: { type: String, default: '' },
  imageAlt: { type: String, default: '' },
  backgroundColor: { type: String, default: '#FACC15' },
  textColor: { type: String, default: '#111827' },
  target: {
    route: { type: String, required: true },
    params: { type: Object, default: {} },
  },
  priority: { type: Number, default: 0, index: true },
  isActive: { type: Boolean, default: true, index: true },
  startsAt: { type: Date, default: null },
  endsAt: { type: Date, default: null },
}, { timestamps: true })

homeBannerSchema.index({ isActive: 1, priority: -1, createdAt: -1 })

const homeBannerModel = mongoose.model('HomeBanner', homeBannerSchema)

export { homeBannerSchema, homeBannerModel }
