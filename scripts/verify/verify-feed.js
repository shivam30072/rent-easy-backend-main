import 'dotenv/config'
import mongoose from 'mongoose'
import MatchScoreModel from '../../api/resources/MatchScore/MatchScore.Model.js'
import { partnerProfileModel } from '../../api/resources/PartnerProfile/PartnerProfile.Schema.js'

await mongoose.connect(process.env.MONGO_URI)
const me = await partnerProfileModel.findOne({ matchScoresComputedAt: { $ne: null } })
if (!me) { console.error('No computed profile — run verify-recompute.js first'); process.exit(1) }

// Page 1
const p1 = await MatchScoreModel.getFeedForViewer(me._id, { limit: 3 })
console.log('page1 count:', p1.items.length, 'hasMore:', p1.hasMore, 'total:', p1.total)
console.log('page1 scores:', p1.items.map(i => i.match.score))

// Page 2 via cursor — assert no overlap with page 1
const p2 = await MatchScoreModel.getFeedForViewer(me._id, { limit: 3, cursor: p1.nextCursor })
const ids1 = new Set(p1.items.map(i => String(i.profile._id)))
const overlap = p2.items.filter(i => ids1.has(String(i.profile._id)))
console.log('page2 count:', p2.items.length, 'overlap with page1 (should be 0):', overlap.length)
console.log('sorted desc:', p1.items.every((it, idx) => idx === 0 || p1.items[idx - 1].match.score >= it.match.score))
console.log('item shape ok:', p1.items.length === 0 || (!!p1.items[0].profile && 'listing' in p1.items[0] && typeof p1.items[0].match.score === 'number'))
await mongoose.disconnect()
