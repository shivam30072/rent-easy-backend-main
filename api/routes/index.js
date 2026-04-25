import { express } from '../helper/index.js'
import addressRoutes from '../resources/Address/Address.Router.js'
import userRoutes from '../resources/User/User.Router.js'
import documentRoutes from '../resources/Document/Document.Router.js'
import propertyRoutes from '../resources/Property/Property.Router.js'
import roomRoutes from '../resources/Room/Room.Router.js'
import ownerRouter from '../resources/Owner/Owner.Router.js'
import rentalAgreementRoutes from '../resources/RentalAgreement/RentalAgreement.Router.js'
import rentPaymentRoutes from '../resources/RentPayment/RentPayment.Router.js'
import { updatingPropertyStats } from '../middleware/updatingPropertyStats.js'
import maintainanceRequestRoutes from '../resources/Request/Request.Router.js'
import enquiryRoutes from '../resources/Enquiry/Enquiry.Router.js'
import deviceTokenRoutes from '../resources/DeviceToken/DeviceToken.Router.js'
import notificationRoutes from '../resources/Notification/Notification.Router.js'
import agreementRequestRoutes from '../resources/AgreementRequest/AgreementRequest.Router.js'
import partnerListingRoutes from '../resources/PartnerListing/PartnerListing.Router.js'
import partnerRequestRoutes from '../resources/PartnerRequest/PartnerRequest.Router.js'
import chatRoutes from '../resources/Chat/Chat.Router.js'
import ratingRoutes from '../resources/Rating/Rating.Router.js'
import reputationRoutes from '../resources/Reputation/Reputation.Router.js'
import ratingExchangeRoutes from '../resources/RatingExchange/RatingExchange.Router.js'
import disputeRoutes from '../resources/Dispute/Dispute.Router.js'

const router = express.Router()

router.use('/address', addressRoutes)
router.use('/user', userRoutes)
router.use('/documents', documentRoutes)
router.use('/property', propertyRoutes)
router.use('/room', updatingPropertyStats, roomRoutes)
router.use('/owner', ownerRouter)
router.use('/rental-agreement', rentalAgreementRoutes)
router.use('/rent-payment', rentPaymentRoutes)
router.use('/requests', maintainanceRequestRoutes)
router.use('/enquiry', enquiryRoutes)
router.use('/device-token', deviceTokenRoutes)
router.use('/notification', notificationRoutes)
router.use('/agreement-request', agreementRequestRoutes)
router.use('/partner-listing', partnerListingRoutes)
router.use('/partner-request', partnerRequestRoutes)
router.use('/chat', chatRoutes)
router.use('/rating', ratingRoutes)
router.use('/reputation', reputationRoutes)
router.use('/rating-exchange', ratingExchangeRoutes)
router.use('/dispute', disputeRoutes)

export default router
