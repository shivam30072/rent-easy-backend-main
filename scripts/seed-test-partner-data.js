import 'dotenv/config'
import mongoose from 'mongoose'
import { userModel } from '../api/resources/User/User.Schema.js'
import { partnerProfileModel } from '../api/resources/PartnerProfile/PartnerProfile.Schema.js'
import { partnerListingModel } from '../api/resources/PartnerListing/PartnerListing.Schema.js'

// ---- Static seed data pools (variety for swipe-flow scoring) ----

const NAMES = [
  'Aarav Sharma', 'Diya Patel', 'Rohan Iyer', 'Ananya Kapoor', 'Vivaan Reddy',
  'Isha Nair', 'Kabir Mehta', 'Saanvi Rao', 'Arjun Desai', 'Meera Bose',
]

const PHOTO_POOL = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=600',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=600',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600',
  'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=600',
  'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=600',
  'https://images.unsplash.com/photo-1463453091185-61582044d556?w=600',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600',
]

const ROOM_PHOTOS = [
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
  'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800',
  'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
  'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800',
]

const LOCALITIES = [
  'Sector 90', 'Sector 18', 'Sector 62', 'Sector 76', 'Sector 137',
  'Sector 93', 'Sector 50', 'Sector 104', 'Sector 75', 'Sector 16',
]

const SLEEP = ['early_bird', 'night_owl', 'flexible']
const CLEAN = ['very_tidy', 'tidy', 'relaxed']
const SMOKE = ['yes', 'no', 'occasional']
const DRINK = ['yes', 'no', 'social']
const DIET = ['veg', 'non_veg', 'jain', 'vegan', 'eggetarian', 'no_preference']
const PETS = ['have', 'love', 'allergic', 'no_preference']
const NOISE = ['quiet', 'moderate', 'lively']
const ROOM_TYPES = ['private', 'shared', 'any']
const GENDERS = ['male', 'female', 'other']
const PROFESSIONS = ['student', 'working_professional', 'other']
const HOSTING = ['often', 'occasional', 'rarely']
const WFH = ['always', 'sometimes', 'never']
const SHARING = ['love_to_share', 'mine_is_mine']

const DEALBREAKERS = [
  'no_smokers', 'no_drinkers', 'must_be_veg', 'no_pets', 'must_be_quiet',
  'must_match_sleep_schedule', 'no_overnight_guests', 'must_be_clean',
  'must_split_chores', 'no_loud_music',
]

const INTERESTS_POOL = [
  'cricket', 'gaming', 'music', 'cooking', 'reading', 'travel', 'movies', 'gym', 'photography', 'yoga',
]

const AMENITIES_VARIATIONS = [
  ['Wifi', 'AC', 'Geyser', 'Parking'],
  ['Wifi', 'AC', 'Power Backup'],
  ['Wifi', 'Geyser', 'Parking', 'Lift'],
  ['Wifi', 'AC', 'Geyser', 'Parking', 'Gym'],
  ['Wifi', 'Power Backup', 'Security'],
]

// Apple HQ test area — center 37.42, -122.08
// Spread within ~5km using ±0.04 degrees lat/lng
const GPS_OFFSETS = [
  { lat: 0.000, lng: 0.000 },
  { lat: 0.020, lng: 0.015 },
  { lat: -0.025, lng: 0.030 },
  { lat: 0.030, lng: -0.020 },
  { lat: -0.015, lng: -0.035 },
  { lat: 0.040, lng: 0.000 },
  { lat: 0.000, lng: 0.040 },
  { lat: -0.040, lng: 0.000 },
  { lat: 0.018, lng: -0.030 },
  { lat: -0.030, lng: -0.015 },
]

const HARDCODED_HASH = '$2a$10$abcdefghijklmnopqrstuv'

const pick3Dealbreakers = (i) => {
  // Rotate through to vary the 3 picked per user
  const start = (i * 3) % DEALBREAKERS.length
  const picks = []
  for (let k = 0; k < 3; k++) {
    picks.push(DEALBREAKERS[(start + k) % DEALBREAKERS.length])
  }
  return picks
}

const pickInterests = (i) => {
  const count = 3 + (i % 3) // 3, 4, or 5
  const start = (i * 2) % INTERESTS_POOL.length
  const out = []
  for (let k = 0; k < count; k++) {
    out.push(INTERESTS_POOL[(start + k) % INTERESTS_POOL.length])
  }
  return out
}

const randomPhone = (i) => {
  // Deterministic 10-digit phone, starts with 9, unique per i
  const base = 9000000000 + (i * 1234567) + Math.floor(Math.random() * 1000)
  return String(base).slice(0, 10)
}

const run = async () => {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI not set in environment.')
    process.exit(1)
  }

  await mongoose.connect(process.env.MONGO_URI)
  console.log('Connected to MongoDB.')

  // ---- Idempotency: clean previous dummy data ----
  const priorUsers = await userModel.find({ email: /^dummy\.partner\./ }).select('_id')
  const priorIds = priorUsers.map(u => u._id)
  if (priorIds.length) {
    await partnerListingModel.deleteMany({ createdBy: { $in: priorIds } })
    await partnerProfileModel.deleteMany({ userId: { $in: priorIds } })
    await userModel.deleteMany({ _id: { $in: priorIds } })
    console.log(`Removed ${priorIds.length} prior dummy users (and their profiles + listings).`)
  } else {
    console.log('No prior dummy entries to remove.')
  }

  let usersCreated = 0
  let profilesCreated = 0
  let listingsCreated = 0

  for (let i = 0; i < 10; i++) {
    const n = i + 1
    const partnerRole = i % 2 === 0 ? 'owner' : 'seeker'
    const gender = GENDERS[i % GENDERS.length]
    const profileRoomType = ROOM_TYPES[i % ROOM_TYPES.length]
    // PartnerListing only allows 'private' | 'shared' — map 'any' -> 'private'
    const listingRoomType = profileRoomType === 'any' ? 'private' : profileRoomType
    const profession = PROFESSIONS[i % PROFESSIONS.length]
    const age = 22 + (i % 11) // 22..32

    // ---- Create User ----
    const user = await userModel.create({
      name: `Dummy Partner ${n}`,
      email: `dummy.partner.${n}@test.local`,
      phone: randomPhone(i),
      passwordHash: HARDCODED_HASH,
      role: 'tenant',
      partnerRole,
      partnerProfileCompleted: true,
      isProfileVerified: true,
    })
    usersCreated++

    // ---- Build profile ----
    const rentMin = 8000 + i * 1000           // 8000..17000
    const rentMax = rentMin + 5000 + (i * 500) // varies, ends up to ~25000
    const earliest = new Date('2026-05-15T00:00:00.000Z')
    const latest = new Date(earliest.getTime() + 30 * 24 * 60 * 60 * 1000)

    const offset = GPS_OFFSETS[i]
    const gpsCoords = {
      lat: 37.42 + offset.lat,
      lng: -122.08 + offset.lng,
    }

    const localities = [
      LOCALITIES[i % LOCALITIES.length],
      LOCALITIES[(i + 3) % LOCALITIES.length],
    ]

    const photos = [
      PHOTO_POOL[i % PHOTO_POOL.length],
      PHOTO_POOL[(i + 5) % PHOTO_POOL.length],
    ]

    const dealbreakers = pick3Dealbreakers(i)
    const interests = pickInterests(i)

    const profileDoc = {
      userId: user._id,
      basics: {
        displayName: NAMES[i],
        age,
        gender,
        profession,
        photos,
      },
      budget: {
        rentMin,
        rentMax,
        depositMax: rentMax * 2,
      },
      moveIn: {
        earliest,
        latest,
        flexible: i % 2 === 0,
      },
      location: {
        preferredCity: 'Noida',
        preferredLocalities: localities,
        gpsCoords,
        radiusKm: 5,
        anchorType: 'gps',
      },
      roomType: profileRoomType,
      lifestyle: {
        sleepSchedule: SLEEP[i % SLEEP.length],
        cleanliness: CLEAN[i % CLEAN.length],
        smoking: SMOKE[i % SMOKE.length],
        drinking: DRINK[i % DRINK.length],
        diet: DIET[i % DIET.length],
        pets: PETS[i % PETS.length],
        noiseLevel: NOISE[i % NOISE.length],
      },
      dealbreakers,
      personality: {
        introExtroScale: (i % 5) + 1, // 1..5
        wfh: WFH[i % WFH.length],
        hostingStyle: HOSTING[i % HOSTING.length],
        sharingStyle: SHARING[i % SHARING.length],
      },
      interests,
      prompts: [
        { promptId: 'about_me', answer: `Hi, I'm ${NAMES[i].split(' ')[0]} — easygoing flatmate who loves ${interests[0]}.` },
        { promptId: 'ideal_weekend', answer: `Weekends are for ${interests[1] || 'chilling'} and good food.` },
        { promptId: 'pet_peeve', answer: `My biggest pet peeve is ${dealbreakers[0].replace(/_/g, ' ')}.` },
      ],
      completionScore: 100,
      lastActiveAt: new Date(),
    }

    const profile = await partnerProfileModel.create(profileDoc)
    profilesCreated++

    // ---- If owner, create a linked listing ----
    if (partnerRole === 'owner') {
      const rentAmount = Math.floor((rentMin + rentMax) / 2)
      const amenities = AMENITIES_VARIATIONS[i % AMENITIES_VARIATIONS.length]
      const images = [
        ROOM_PHOTOS[i % ROOM_PHOTOS.length],
        ROOM_PHOTOS[(i + 2) % ROOM_PHOTOS.length],
      ]

      await partnerListingModel.create({
        createdBy: user._id,
        linkedProfile: profile._id,
        roomType: listingRoomType,
        totalOccupancy: 2,
        availableSlots: 1,
        rentAmount,
        rentSplitType: 'equal',
        securityDeposit: 2 * rentAmount,
        availabilityDate: earliest,
        description: `Cozy room near ${localities[0]}. Looking for a chill flatmate.`,
        images,
        amenities,
        city: 'Bengaluru',
        locality: localities[0],
        coordinates: gpsCoords,
        status: 'active',
        trialOpen: i % 4 === 0, // alternating-ish true/false
      })
      listingsCreated++
    }

    console.log(`  [${n}/10] ${user.email}  role=${partnerRole}  gender=${gender}  gps=(${gpsCoords.lat.toFixed(3)}, ${gpsCoords.lng.toFixed(3)})`)
  }

  console.log(`\nCreated ${usersCreated} users, ${profilesCreated} profiles, ${listingsCreated} listings.`)
  await mongoose.disconnect()
  console.log('Disconnected.')
}

run().catch(err => {
  console.error('Seed failed:', err)
  mongoose.disconnect().finally(() => process.exit(1))
})
