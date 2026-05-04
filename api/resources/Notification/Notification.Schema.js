
import { mongoose } from '../../helper/index.js'

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['rent_reminder', 'agreement_expiry', 'new_property_nearby', 'generic', 'enquiry', 'agreement_request', 'rent_payment', 'partner_request', 'partner_request_accepted', 'partner_request_rejected', 'partner_contact_shared', 'partner_chat_message', 'rating_required', 'rating_published', 'dispute_resolved', 'leave_notice_submitted', 'settlement_created', 'damages_added', 'refund_paid', 'settlement_deadline_approaching', 'settlement_disputed', 'partner_match_new', 'partner_match_score_unlocked', 'partner_pulse_match', 'partner_vouch_received', 'partner_trial_proposed', 'partner_trial_confirmed', 'partner_trial_completed', 'partner_voice_date_request', 'partner_voice_date_declined', 'partner_voice_date_completed'], required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  triggeredAt: { type: Date, default: Date.now },
  meta: { type: Object, default: {} } // store related ids (roomId/propertyId) etc.
}, { timestamps: true })

notificationSchema.index({ userId: 1, isRead: 1 })

notificationSchema.set('toJSON', { virtuals: true })
notificationSchema.set('toObject', { virtuals: true })

const notificationModel = mongoose.model('Notification', notificationSchema)

export { notificationSchema, notificationModel }
