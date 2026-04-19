import { ownerModel } from './Owner.Schema.js'
import { propertyModel } from '../Property/Property.Schema.js'
import { rentPaymentModel as rentModel } from '../RentPayment/RentPayment.Schema.js'
import { mongoose } from '../../helper/index.js'
import { documentModel } from '../Document/Document.Schema.js'
import { rentalAgreementModel } from '../RentalAgreement/RentalAgreement.Schema.js'

const createOwner = async (ownerData) => {
  return await ownerModel.create(ownerData)
}

const getOwners = async (filter = {}, projection = {}, options = {}) => {
  return await ownerModel.find(filter, projection, options).populate('userId').populate('ownedProperties')
}

const getOwnerById = async (id) => {
  return await ownerModel.findById(id).populate('userId').populate('ownedProperties')
}

const updateOwner = async (id, updateData) => {
  return await ownerModel.findByIdAndUpdate(id, updateData, { new: true })
}

const deleteOwner = async (id) => {
  return await ownerModel.findByIdAndDelete(id)
}

const getOwnerDashboard = async (ownerId) => {
  try {
    // 1️⃣ Get Owner Details
    const owner = await ownerModel.findById(ownerId)
      .populate('userId', 'name email phone') // from User schema
      .lean()

    if (!owner) {
      return res.status(404).json({ error: 'Owner not found' })
    }

    console.log('Owner:: ', owner)

    const documents = await documentModel.find({ userId: owner.userId._id })
      .select('-__v')  // exclude __v if you want
      .lean()

    // 2️⃣ Get All Properties with Rooms
    const properties = await propertyModel.find({ ownerId: owner._id })
      .populate({
        path: 'rooms',
        options: { sort: { createdAt: -1 } },
        populate: {
          path: 'rentalHistory.tenantId',   // nested populate
          select: 'name'                    // only fetch name field
        }
      })
      .lean({ virtuals: true })

    // Flatten all rooms for easy stats
    const allRooms = properties.flatMap(p => p.rooms || [])

    // 3️⃣ Occupancy Stats
    const totalRooms = allRooms.length
    const ownerUserId = owner.userId._id || owner.userId
    const activeAgreementRoomIds = await rentalAgreementModel.distinct('roomId', {
      ownerId: new mongoose.Types.ObjectId(ownerUserId),
      isActive: true
    })
    const occupiedRooms = activeAgreementRoomIds.length

    const occupancyRate = totalRooms > 0
      ? ((occupiedRooms / totalRooms) * 100).toFixed(2)
      : 0

    // 4️⃣ Rent Collection Stats (This Month & Year)
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfYear = new Date(now.getFullYear(), 0, 1)

    const [monthlyRent, yearlyRent] = await Promise.all([
      rentModel.aggregate([
        {
          $match: {
            ownerId: new mongoose.Types.ObjectId(ownerId),
            paymentDate: { $gte: startOfMonth },
            status: 'paid'
          }
        },
        { $group: { _id: null, total: { $sum: '$totalAmountCollected' } } }
      ]),
      rentModel.aggregate([
        {
          $match: {
            ownerId: new mongoose.Types.ObjectId(ownerId),
            paymentDate: { $gte: startOfYear },
            status: 'paid'
          }
        },
        { $group: { _id: null, total: { $sum: '$totalAmountCollected' } } }
      ])
    ])

    // 5️⃣ Pending Rent Payments
    const pendingRents = await rentModel.find({
      ownerId,
      status: 'pending'
    })
      .populate('userId', 'name email')
      .populate('agreementId', 'startDate endDate')
      .lean()

    // 6️⃣ Average Ratings
    const propertyRatings = properties.map(p => p.rating || 0)
    const avgRating = propertyRatings.length > 0
      ? (propertyRatings.reduce((a, b) => a + b, 0) / propertyRatings.length).toFixed(2)
      : 0

    // 7️⃣ Build Dashboard Response
    const dashboard = {
      ownerInfo: {
        ...owner,
        bankDetails: owner.bankDetails || {},
        documents
      },
      stats: {
        totalProperties: properties.length,
        totalRooms,
        occupiedRooms,
        occupancyRate: `${occupancyRate}%`,
        avgRating,
      },
      rentSummary: {
        monthlyCollected: monthlyRent[0]?.total || 0,
        yearlyCollected: yearlyRent[0]?.total || 0,
      },
      pendingPayments: pendingRents,
      properties
    }

    return dashboard

  } catch (err) {
    throw new Error(err)
  }
}

const OwnerModel = {
  createOwner,
  getOwners,
  getOwnerById,
  updateOwner,
  deleteOwner,
  getOwnerDashboard
}

export default OwnerModel
