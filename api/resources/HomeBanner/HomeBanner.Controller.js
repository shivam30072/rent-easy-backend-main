import { homeBannerModel } from './HomeBanner.Schema.js'

const activeWindowFilter = (now = new Date()) => ({
  isActive: true,
  $and: [
    { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
    { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
  ],
})

const defaultBannerForRole = (role) => {
  if (role === 'owner') {
    return {
      key: 'default-owner-rent-score',
      roles: ['owner'],
      eyebrow: 'Rent Score setup',
      title: 'Verified bank details improve owner trust',
      message: 'A stronger owner profile helps tenants choose with confidence.',
      icon: 'trending-up',
      imageUrl: '',
      imageAlt: '',
      backgroundColor: '#FACC15',
      textColor: '#111827',
      target: { route: 'BankDetails', params: {} },
      priority: -1,
      isDefault: true,
    }
  }

  return {
    key: 'default-tenant-kyc-score',
    roles: ['tenant'],
    eyebrow: 'Rent Score boost',
    title: 'Complete KYC to increase your Rent Score',
    message: 'A higher score helps owners trust you faster when you enquire.',
    icon: 'shield-checkmark',
    imageUrl: '',
    imageAlt: '',
    backgroundColor: '#FACC15',
    textColor: '#111827',
    target: { route: 'KycProcess', params: { step: 'documents' } },
    priority: -1,
    isDefault: true,
  }
}

const getActiveBanners = async (req, res) => {
  const role = req.query?.role || req.user?.role || 'all'
  const limit = Math.min(Number(req.query?.limit) || 1, 10)

  let banners = await homeBannerModel
    .find({
      ...activeWindowFilter(),
      roles: { $in: [role, 'all'] },
    })
    .sort({ priority: -1, createdAt: -1 })
    .limit(limit)
    .lean()

  if (banners.length === 0 && limit > 0) {
    banners = [defaultBannerForRole(role)]
  }

  return res.success(200, 'Active home banners fetched.', banners)
}

const listBanners = async (req, res) => {
  const banners = await homeBannerModel
    .find({})
    .sort({ priority: -1, createdAt: -1 })
    .lean()

  return res.success(200, 'Home banners fetched.', banners)
}

const createBanner = async (req, res) => {
  const banner = await homeBannerModel.create(req.body)
  return res.success(201, 'Home banner created.', banner)
}

const updateBanner = async (req, res) => {
  const banner = await homeBannerModel.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true },
  )
  if (!banner) return res.status(404).json({ success: false, message: 'Home banner not found' })

  return res.success(200, 'Home banner updated.', banner)
}

const deleteBanner = async (req, res) => {
  const banner = await homeBannerModel.findByIdAndDelete(req.params.id)
  if (!banner) return res.status(404).json({ success: false, message: 'Home banner not found' })

  return res.success(200, 'Home banner deleted.', {})
}

const HomeBannerController = {
  getActiveBanners,
  listBanners,
  createBanner,
  updateBanner,
  deleteBanner,
}

export default HomeBannerController
