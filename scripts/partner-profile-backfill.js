import 'dotenv/config'
import mongoose from 'mongoose'
import { userModel } from '../api/resources/User/User.Schema.js'
import { partnerListingModel } from '../api/resources/PartnerListing/PartnerListing.Schema.js'
import { partnerRequestModel } from '../api/resources/PartnerRequest/PartnerRequest.Schema.js'
import { partnerProfileModel } from '../api/resources/PartnerProfile/PartnerProfile.Schema.js'

const ARGS = { dry: process.argv.includes('--dry') }

const guessAge = (user) => user.dob ? Math.floor((Date.now() - new Date(user.dob).getTime()) / (365.25 * 24 * 3600 * 1000)) : 25

const buildProfileFromListing = (user, listing) => ({
  userId: user._id,
  basics: {
    displayName: user.name || 'User',
    age: guessAge(user),
    gender: user.gender || 'other',
    profession: 'working_professional',
    photos: listing?.images?.slice(0, 3) || [],
  },
  budget: {
    rentMin: listing?.rentAmount ? Math.max(0, listing.rentAmount - 5000) : 5000,
    rentMax: listing?.rentAmount ? listing.rentAmount + 5000 : 30000,
    depositMax: listing?.securityDeposit || 0,
  },
  moveIn: {
    earliest: listing?.availabilityDate || new Date(),
    latest: new Date(Date.now() + 60 * 24 * 3600 * 1000),
    flexible: true,
  },
  location: {
    preferredCity: listing?.city || 'Bengaluru',
    preferredLocalities: listing?.locality ? [listing.locality] : [],
    gpsCoords: listing?.coordinates && listing.coordinates.lat ? listing.coordinates : { lat: 12.97, lng: 77.59 },
    radiusKm: 5,
    anchorType: 'pin',
  },
  roomType: listing?.roomType || 'any',
  lifestyle: {
    sleepSchedule: 'flexible',
    cleanliness: 'tidy',
    smoking: listing?.preferences?.smoking || 'no_preference',
    drinking: listing?.preferences?.drinking || 'no_preference',
    diet: 'no_preference',
    pets: listing?.preferences?.pets || 'no_preference',
    noiseLevel: 'moderate',
  },
  dealbreakers: ['no_smokers', 'must_be_clean', 'no_loud_music'],
  completionScore: 50,
})

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI)
  console.log('Connected.')

  const seekerIds = await partnerRequestModel.distinct('seekerId')
  const ownerIds = await partnerListingModel.distinct('createdBy')
  const userIds = [...new Set([...seekerIds, ...ownerIds].map(String))]
  console.log(`Found ${userIds.length} candidate users.`)

  let created = 0, skipped = 0
  for (const uid of userIds) {
    const existing = await partnerProfileModel.findOne({ userId: uid })
    if (existing) { skipped++; continue }

    const user = await userModel.findById(uid)
    if (!user) { skipped++; continue }
    const listing = await partnerListingModel.findOne({ createdBy: uid }).sort({ createdAt: -1 })

    const data = buildProfileFromListing(user, listing)
    if (ARGS.dry) {
      console.log('[dry] would create profile for', user.email || user._id)
    } else {
      await partnerProfileModel.create(data)
      created++
    }
  }

  // Link existing listings to their creator's new profile
  if (!ARGS.dry) {
    const listings = await partnerListingModel.find({ linkedProfile: { $exists: false } })
    for (const l of listings) {
      const p = await partnerProfileModel.findOne({ userId: l.createdBy })
      if (p) {
        l.linkedProfile = p._id
        await l.save()
      }
    }
  }

  console.log(`Created ${created}, skipped ${skipped}.`)
  await mongoose.disconnect()
}

run().catch(err => { console.error(err); process.exit(1) })
