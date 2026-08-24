import 'dotenv/config'
import mongoose from 'mongoose'
import MatchScoreModel from '../../api/resources/MatchScore/MatchScore.Model.js'
import { partnerProfileModel } from '../../api/resources/PartnerProfile/PartnerProfile.Schema.js'
import { matchScoreModel } from '../../api/resources/MatchScore/MatchScore.Schema.js'

await mongoose.connect(process.env.MONGO_URI)
const me = await partnerProfileModel.findOne({ 'location.gpsCoords.lat': { $exists: true } })
if (!me) { console.error('No profile with gps found — run npm run seed first'); process.exit(1) }

const n = await MatchScoreModel.recomputeAllForProfile(me._id)
const fresh = await partnerProfileModel.findById(me._id).select('matchScoresComputedAt')
const rows = await matchScoreModel.find({ $or: [{ profileA: me._id }, { profileB: me._id }] })
const overCap = rows.filter(r => r.distanceKm != null && r.distanceKm > 25)

console.log('pairs computed:', n)
console.log('matchScoresComputedAt set:', !!fresh.matchScoresComputedAt)
console.log('rows over 25km cap (should be 0):', overCap.length)
await mongoose.disconnect()
