/**
 * ============================================================
 *  RentEasy — Database Seed Script
 * ============================================================
 *  Run:  node seed.js
 *
 *  What it creates:
 *   1. 15 properties (3 rooms each) under existing owner 69c91d02771b1af9a9559efe
 *   2. 5 new owner users (KYC done, all details) — each with 2 properties, 2 rooms/property
 *   3. 5 normal users (KYC done, all details)
 *
 *  The script is IDEMPOTENT — re-running it will skip if data already exists
 *  (checks by email). Pass --force to wipe seed data and re-insert.
 * ============================================================
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'

dotenv.config()

// ── Models ───────────────────────────────────────────────────
import { userModel } from './api/resources/User/User.Schema.js'
import { ownerModel } from './api/resources/Owner/Owner.Schema.js'
import { propertyModel } from './api/resources/Property/Property.Schema.js'
import { roomModel } from './api/resources/Room/Room.Schema.js'
import { addressModel } from './api/resources/Address/Address.Schema.js'
import { documentModel } from './api/resources/Document/Document.Schema.js'

// ── Config ───────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI
const FORCE = process.argv.includes('--force')
const EXISTING_OWNER_ID = '69c91d59771b1af9a9559f05' // Owner doc _id (userId: 69c91d02771b1af9a9559efe)
const DEFAULT_PASSWORD = 'Test@1234'

// ── Helpers ──────────────────────────────────────────────────
const oid = (hex) => new mongoose.Types.ObjectId(hex)
const newId = () => new mongoose.Types.ObjectId()
const randCode = () => crypto.randomBytes(2).toString('hex').toUpperCase()
const hashPw = async (pw) => bcrypt.hash(pw, 10)

const makeUniquePropertyCode = (state, city, num) => {
  const s = (state || 'XX').slice(0, 2).toUpperCase()
  const c = (city || 'XXX').slice(0, 3).toUpperCase()
  return `${s}-${c}-${num}-${randCode()}`
}

// ── Indian cities data for realistic properties ──────────────
const CITIES = [
  { city: 'Mumbai',      state: 'Maharashtra',     pin: '400001', lat: 19.0760, lng: 72.8777 },
  { city: 'Delhi',       state: 'Delhi',           pin: '110001', lat: 28.7041, lng: 77.1025 },
  { city: 'Bangalore',   state: 'Karnataka',       pin: '560001', lat: 12.9716, lng: 77.5946 },
  { city: 'Hyderabad',   state: 'Telangana',       pin: '500001', lat: 17.3850, lng: 78.4867 },
  { city: 'Chennai',     state: 'Tamil Nadu',      pin: '600001', lat: 13.0827, lng: 80.2707 },
  { city: 'Pune',        state: 'Maharashtra',     pin: '411001', lat: 18.5204, lng: 73.8567 },
  { city: 'Kolkata',     state: 'West Bengal',     pin: '700001', lat: 22.5726, lng: 88.3639 },
  { city: 'Ahmedabad',   state: 'Gujarat',         pin: '380001', lat: 23.0225, lng: 72.5714 },
  { city: 'Jaipur',      state: 'Rajasthan',       pin: '302001', lat: 26.9124, lng: 75.7873 },
  { city: 'Lucknow',     state: 'Uttar Pradesh',   pin: '226001', lat: 26.8467, lng: 80.9462 },
  { city: 'Noida',       state: 'Uttar Pradesh',   pin: '201301', lat: 28.5355, lng: 77.3910 },
  { city: 'Gurgaon',     state: 'Haryana',         pin: '122001', lat: 28.4595, lng: 77.0266 },
  { city: 'Indore',      state: 'Madhya Pradesh',  pin: '452001', lat: 22.7196, lng: 75.8577 },
  { city: 'Chandigarh',  state: 'Chandigarh',      pin: '160001', lat: 30.7333, lng: 76.7794 },
  { city: 'Kochi',       state: 'Kerala',          pin: '682001', lat: 9.9312,  lng: 76.2673 },
]

const PROPERTY_NAMES = [
  'Sunrise Residency', 'Green Valley Apartments', 'Skyline Tower', 'Royal Heritage Villa',
  'Palm Court', 'Metro Heights', 'Lake View Residences', 'Silver Oak Apartments',
  'The Grand Orchid', 'Crystal Plaza', 'Emerald Bay', 'Golden Gate Residency',
  'Riviera Heights', 'Blue Sapphire Enclave', 'The Windsor Estate',
  'Cedar Woods', 'Ivory Tower', 'Platinum Suites', 'The Pinnacle', 'Sapphire Gardens',
  'Rose Petal Villa', 'Ocean Breeze Apartments', 'Mountain View Heights', 'Urban Nest',
  'Tranquil Heights',
]

const FEATURES_POOL = [
  'ac', 'lift', 'security', 'gym', 'swimming_pool', 'parking', 'power_backup',
  'water_supply', 'garden', 'clubhouse', 'cctv', 'intercom', 'fire_safety',
  'rainwater_harvesting', 'wifi', 'play_area', 'jogging_track', 'temple',
]

const HIGHLIGHTS_POOL = [
  'Near Metro Station', 'Gated Community', '24/7 Security', 'Close to IT Park',
  'Near Hospital', 'School Nearby', 'Mall Within 1km', 'Park View',
  'Corner Unit', 'Vastu Compliant', 'Ready to Move', 'Brand New',
  'Prime Location', 'Near Airport', 'Lake Facing',
]

const AMENITIES_POOL = [
  'WiFi', 'AC', 'Geyser', 'Washing Machine', 'Refrigerator', 'TV',
  'Wardrobe', 'Study Table', 'Microwave', 'Sofa', 'Dining Table', 'Bed',
  'Curtains', 'Mattress', 'Kitchen Accessories',
]

const PROPERTY_TYPES = ['flat', 'villa', 'independent_house', 'other']
const FURNISHING = ['unfurnished', 'semi-furnished', 'fully-furnished']
const ROOM_TYPES = ['Single', 'Double', 'Suite', 'Flat', 'Other']
const BHK_TYPES = ['1BHK', '2BHK', '3BHK', '4BHK', '5BHK']
const PREFERRED_TENANT = ['Family', 'Bachelor', 'Any', 'Student', 'Working Professional']

// ── Real property images (Unsplash - free to use) ────────────
const PROPERTY_IMAGES = [
  'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1599809275671-b5942cabc7a2?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1584738766473-61c083514bf4?w=800&h=600&fit=crop',
]

// ── Real room interior images (Unsplash) ─────────────────────
const ROOM_IMAGES = [
  'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1556020685-ae41abfc9365?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1560448075-cbc16bb4af8e?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1617325247661-675ab4b64ae2?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1560440021-33f9b867899d?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1585412727339-54e4bae3bbf9?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1598928506311-c55ez637a530?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1590490360182-c33d955e9890?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&h=600&fit=crop',
]

// ── Real profile avatar images (Unsplash) ────────────────────
const PROFILE_IMAGES = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop&crop=face',
]

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const pickN = (arr, n) => {
  const shuffled = [...arr].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, Math.min(n, arr.length))
}
const randBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const pickUniqueN = (arr, n) => pickN(arr, n) // pick n unique random items from array

// ── Owner names for 5 new owners ─────────────────────────────
const NEW_OWNERS = [
  { name: 'Rajesh Kumar',     email: 'rajesh.kumar@seedtest.com',     phone: '9100000001', aadhaar: '234567890121' },
  { name: 'Priya Sharma',     email: 'priya.sharma@seedtest.com',     phone: '9100000002', aadhaar: '234567890122' },
  { name: 'Amit Patel',       email: 'amit.patel@seedtest.com',       phone: '9100000003', aadhaar: '234567890123' },
  { name: 'Sneha Reddy',      email: 'sneha.reddy@seedtest.com',      phone: '9100000004', aadhaar: '234567890124' },
  { name: 'Vikram Singh',     email: 'vikram.singh@seedtest.com',     phone: '9100000005', aadhaar: '234567890125' },
]

// ── Normal user names ────────────────────────────────────────
const NORMAL_USERS = [
  { name: 'Ananya Gupta',     email: 'ananya.gupta@seedtest.com',     phone: '9200000001', aadhaar: '345678901231' },
  { name: 'Rohit Mehta',      email: 'rohit.mehta@seedtest.com',      phone: '9200000002', aadhaar: '345678901232' },
  { name: 'Neha Verma',       email: 'neha.verma@seedtest.com',       phone: '9200000003', aadhaar: '345678901233' },
  { name: 'Karan Joshi',      email: 'karan.joshi@seedtest.com',      phone: '9200000004', aadhaar: '345678901234' },
  { name: 'Divya Nair',       email: 'divya.nair@seedtest.com',       phone: '9200000005', aadhaar: '345678901235' },
]

// ── Builders ─────────────────────────────────────────────────

/**
 * Create an Address document
 */
async function createAddress(cityData, userId) {
  const addr = await addressModel.create({
    userId,
    state: cityData.state,
    city: cityData.city,
    pincode: cityData.pin,
    fullAddress: `${randBetween(1, 500)}, Sector ${randBetween(1, 50)}, ${cityData.city}, ${cityData.state} - ${cityData.pin}`,
    geoLocation: {
      type: 'Point',
      coordinates: [
        cityData.lng + (Math.random() - 0.5) * 0.05,
        cityData.lat + (Math.random() - 0.5) * 0.05,
      ],
    },
  })
  return addr
}

/**
 * Create KYC documents (aadhaar + pan) for a user
 */
async function createKycDocs(userId, aadhaarNum) {
  const panNumber = `ABCDE${randBetween(1000, 9999)}F`
  await documentModel.create([
    {
      userId,
      docType: 'aadhaar',
      url: `https://rent-easy-media.s3.amazonaws.com/docs/aadhaar_${userId}.jpg`,
      isVerified: true,
      uniqueNumber: aadhaarNum,
    },
    {
      userId,
      docType: 'pan',
      url: `https://rent-easy-media.s3.amazonaws.com/docs/pan_${userId}.jpg`,
      isVerified: true,
      uniqueNumber: panNumber,
    },
  ])
}

/**
 * Create a property with rooms
 */
async function createPropertyWithRooms({ ownerId, ownerUserId, cityData, propertyName, roomCount }) {
  // Create property address
  const propAddr = await createAddress(cityData, ownerUserId)

  const bhk = pick(BHK_TYPES)
  const propType = pick(PROPERTY_TYPES)
  const furn = pick(FURNISHING)
  const features = pickN(FEATURES_POOL, randBetween(3, 8))
  const highlights = pickN(HIGHLIGHTS_POOL, randBetween(2, 5))
  const baseRent = randBetween(5000, 80000)
  const totalFloors = randBetween(2, 20)
  const floor = randBetween(0, totalFloors)

  const property = await propertyModel.create({
    ownerId,
    addressId: propAddr._id,
    propertyName,
    propertyType: propType,
    description: `Beautiful ${bhk} ${propType.replace('_', ' ')} located in ${cityData.city}. ${furn.replace('-', ' ')} with modern amenities. Perfect for ${pick(PREFERRED_TENANT).toLowerCase()}.`,
    bhkType: bhk,
    size: randBetween(400, 3000),
    floor,
    totalFloors,
    availableFrom: new Date(Date.now() + randBetween(-30, 60) * 24 * 60 * 60 * 1000),
    preferredTenant: pick(PREFERRED_TENANT),
    parking: Math.random() > 0.3,
    features,
    images: pickUniqueN(PROPERTY_IMAGES, randBetween(3, 5)),
    isActive: true,
    isArchived: false,
    highlights,
    uniquePropertyCode: makeUniquePropertyCode(cityData.state, cityData.city, randBetween(100, 999)),
    furnishing: furn,
    rating: parseFloat((Math.random() * 3 + 2).toFixed(1)), // 2.0 – 5.0
    minAmount: baseRent,
    maxAmount: baseRent + randBetween(2000, 15000),
  })

  // Link property to owner
  await ownerModel.findByIdAndUpdate(ownerId, {
    $addToSet: { ownedProperties: property._id },
  })

  // Create rooms for this property
  const rooms = []
  for (let r = 0; r < roomCount; r++) {
    const roomRent = randBetween(baseRent * 0.3, baseRent)
    const room = await roomModel.create({
      propertyId: property._id,
      roomNumber: `${floor}${String.fromCharCode(65 + r)}${randBetween(1, 9)}`,
      roomType: pick(ROOM_TYPES),
      description: `Spacious room with ${pick(AMENITIES_POOL).toLowerCase()} and ${pick(AMENITIES_POOL).toLowerCase()}. Well-ventilated with natural light.`,
      rent: roomRent,
      rentDueDay: randBetween(1, 28),
      maintenanceCharge: {
        amount: randBetween(500, 3000),
        frequency: pick(['monthly', 'annually']),
      },
      securityDeposit: {
        amount: roomRent * randBetween(1, 3),
        frequency: 'monthly',
      },
      otherCharges: randBetween(0, 1000),
      isAvailable: Math.random() > 0.2,
      amenities: pickN(AMENITIES_POOL, randBetween(3, 8)),
      roomSize: `${randBetween(100, 600)} sqft`,
      floorNumber: floor,
      images: pickUniqueN(ROOM_IMAGES, randBetween(2, 4)),
      addressId: propAddr._id,
      rating: parseFloat((Math.random() * 3 + 2).toFixed(1)),
    })
    rooms.push(room)
  }

  return { property, rooms }
}

// ══════════════════════════════════════════════════════════════
// ██  MAIN SEED FUNCTION
// ══════════════════════════════════════════════════════════════
async function seed() {
  console.log('🌱 RentEasy Seed Script Starting...\n')

  // ── Connect ────────────────────────────────────────────────
  await mongoose.connect(MONGO_URI)
  console.log('✅ MongoDB connected\n')

  // ── Force mode: clean up previous seed data ────────────────
  if (FORCE) {
    console.log('⚠️  --force flag detected. Cleaning previous seed data...')
    const seedEmails = [
      ...NEW_OWNERS.map(o => o.email),
      ...NORMAL_USERS.map(u => u.email),
    ]
    const seedUsers = await userModel.find({ email: { $in: seedEmails } })
    const seedUserIds = seedUsers.map(u => u._id)

    if (seedUserIds.length) {
      // Remove owners + their properties + rooms
      const owners = await ownerModel.find({ userId: { $in: seedUserIds } })
      const ownerIds = owners.map(o => o._id)
      const props = await propertyModel.find({ ownerId: { $in: ownerIds } })
      const propIds = props.map(p => p._id)

      await roomModel.deleteMany({ propertyId: { $in: propIds } })
      await propertyModel.deleteMany({ _id: { $in: propIds } })
      await ownerModel.deleteMany({ _id: { $in: ownerIds } })
      await addressModel.deleteMany({ userId: { $in: seedUserIds } })
      await documentModel.deleteMany({ userId: { $in: seedUserIds } })
      await userModel.deleteMany({ _id: { $in: seedUserIds } })
      console.log('   🗑️  Cleaned previous seed users, owners, properties, rooms, docs\n')
    }

    // Clean properties under existing owner that were seeded
    // (we'll just recreate them)
    const existingOwner = await ownerModel.findById(EXISTING_OWNER_ID).catch(() => null)
    if (existingOwner) {
      const existingProps = await propertyModel.find({ ownerId: oid(EXISTING_OWNER_ID) })
      const existingPropIds = existingProps.map(p => p._id)
      if (existingPropIds.length) {
        await roomModel.deleteMany({ propertyId: { $in: existingPropIds } })
        await propertyModel.deleteMany({ _id: { $in: existingPropIds } })
        await ownerModel.findByIdAndUpdate(EXISTING_OWNER_ID, { $set: { ownedProperties: [] } })
        console.log('   🗑️  Cleaned existing owner properties & rooms\n')
      }
    }
  }

  // ──────────────────────────────────────────────────────────
  // 1. 15 Properties + 3 Rooms each under existing owner
  // ──────────────────────────────────────────────────────────
  console.log('━'.repeat(60))
  console.log('📦 STEP 1: Creating 15 properties (3 rooms each) for existing owner')
  console.log('   Owner ID:', EXISTING_OWNER_ID)
  console.log('━'.repeat(60))

  const existingOwner = await ownerModel.findById(EXISTING_OWNER_ID)
  if (!existingOwner) {
    console.error(`❌ Owner with ID ${EXISTING_OWNER_ID} not found in database!`)
    console.error('   Make sure this owner exists before running the seed script.')
    process.exit(1)
  }

  // Get the userId associated with this owner
  const existingOwnerUserId = existingOwner.userId

  let propNameIdx = 0
  for (let i = 0; i < 15; i++) {
    const cityData = CITIES[i % CITIES.length]
    const name = PROPERTY_NAMES[propNameIdx++]
    const result = await createPropertyWithRooms({
      ownerId: oid(EXISTING_OWNER_ID),
      ownerUserId: existingOwnerUserId,
      cityData,
      propertyName: name,
      roomCount: 3,
    })
    console.log(`   ✅ ${i + 1}. "${result.property.propertyName}" — ${cityData.city} (${result.rooms.length} rooms)`)
  }
  console.log()

  // ──────────────────────────────────────────────────────────
  // 2. 5 New Owners — KYC done, 2 properties, 2 rooms each
  // ──────────────────────────────────────────────────────────
  console.log('━'.repeat(60))
  console.log('👤 STEP 2: Creating 5 new owners (KYC complete, 2 props × 2 rooms)')
  console.log('━'.repeat(60))

  const hashedPassword = await hashPw(DEFAULT_PASSWORD)

  for (let i = 0; i < NEW_OWNERS.length; i++) {
    const ownerData = NEW_OWNERS[i]
    const cityData = CITIES[i % CITIES.length]

    // Check if user already exists
    const existingUser = await userModel.findOne({ email: ownerData.email })
    if (existingUser) {
      console.log(`   ⏭️  Skipping "${ownerData.name}" — already exists`)
      continue
    }

    // Create user address
    const userAddr = await createAddress(cityData, null)

    // Create user
    const user = await userModel.create({
      name: ownerData.name,
      email: ownerData.email,
      phone: ownerData.phone,
      passwordHash: hashedPassword,
      role: 'owner',
      isProfileVerified: true,
      profileUrl: PROFILE_IMAGES[i % PROFILE_IMAGES.length],
      aadhaarNumber: ownerData.aadhaar,
      kycVerified: true,
      address: {
        state: cityData.state,
        city: cityData.city,
        pincode: cityData.pin,
        fullAddress: userAddr.fullAddress,
        geoLocation: userAddr.geoLocation,
      },
    })

    // Update address with userId
    await addressModel.findByIdAndUpdate(userAddr._id, { userId: user._id })

    // Create KYC documents
    await createKycDocs(user._id, ownerData.aadhaar)

    // Create owner record
    const owner = await ownerModel.create({
      userId: user._id,
      ownedProperties: [],
      bankDetails: {
        accountHolderName: ownerData.name,
        accountNumber: `${randBetween(10000000, 99999999)}${randBetween(1000, 9999)}`,
        ifsc: `HDFC0${randBetween(100000, 999999)}`,
      },
      penaltyPercentPerDay: randBetween(1, 3),
    })

    // Create 2 properties with 2 rooms each
    for (let p = 0; p < 2; p++) {
      const propCity = CITIES[(i * 2 + p) % CITIES.length]
      const propName = PROPERTY_NAMES[propNameIdx++ % PROPERTY_NAMES.length]
      const result = await createPropertyWithRooms({
        ownerId: owner._id,
        ownerUserId: user._id,
        cityData: propCity,
        propertyName: propName,
        roomCount: 2,
      })
      console.log(`   ✅ Owner "${ownerData.name}" → "${result.property.propertyName}" (${propCity.city}, ${result.rooms.length} rooms)`)
    }
  }
  console.log()

  // ──────────────────────────────────────────────────────────
  // 3. 5 Normal Users — KYC complete, all details filled
  // ──────────────────────────────────────────────────────────
  console.log('━'.repeat(60))
  console.log('🙋 STEP 3: Creating 5 normal users (KYC complete, all details)')
  console.log('━'.repeat(60))

  for (let i = 0; i < NORMAL_USERS.length; i++) {
    const userData = NORMAL_USERS[i]
    const cityData = CITIES[(i + 5) % CITIES.length]

    // Check if user already exists
    const existingUser = await userModel.findOne({ email: userData.email })
    if (existingUser) {
      console.log(`   ⏭️  Skipping "${userData.name}" — already exists`)
      continue
    }

    // Create user address
    const userAddr = await createAddress(cityData, null)

    // Create user
    const user = await userModel.create({
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      passwordHash: hashedPassword,
      role: 'tenant',
      isProfileVerified: true,
      profileUrl: PROFILE_IMAGES[(i + 5) % PROFILE_IMAGES.length],
      aadhaarNumber: userData.aadhaar,
      kycVerified: true,
      address: {
        state: cityData.state,
        city: cityData.city,
        pincode: cityData.pin,
        fullAddress: userAddr.fullAddress,
        geoLocation: userAddr.geoLocation,
      },
    })

    // Update address with userId
    await addressModel.findByIdAndUpdate(userAddr._id, { userId: user._id })

    // Create KYC documents
    await createKycDocs(user._id, userData.aadhaar)

    console.log(`   ✅ User "${userData.name}" — ${cityData.city} (${userData.email})`)
  }
  console.log()

  // ── Summary ────────────────────────────────────────────────
  console.log('━'.repeat(60))
  console.log('📊 SEED SUMMARY')
  console.log('━'.repeat(60))

  const totalProps = await propertyModel.countDocuments()
  const totalRooms = await roomModel.countDocuments()
  const totalUsers = await userModel.countDocuments()
  const totalOwners = await ownerModel.countDocuments()
  const totalDocs = await documentModel.countDocuments()

  console.log(`   Properties : ${totalProps}`)
  console.log(`   Rooms      : ${totalRooms}`)
  console.log(`   Users      : ${totalUsers}`)
  console.log(`   Owners     : ${totalOwners}`)
  console.log(`   Documents  : ${totalDocs}`)
  console.log()
  console.log('   🔑 Default password for all seed users: ' + DEFAULT_PASSWORD)
  console.log()
  console.log('✅ Seeding complete!')
  console.log('━'.repeat(60))

  await mongoose.disconnect()
  process.exit(0)
}

// ── Run ──────────────────────────────────────────────────────
seed().catch((err) => {
  console.error('❌ Seed script failed:', err)
  mongoose.disconnect()
  process.exit(1)
})
