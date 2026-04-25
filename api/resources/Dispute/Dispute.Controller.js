import DisputeModel from './Dispute.Model.js'
import { DISPUTE_MESSAGES } from './Dispute.Constant.js'

const raise = async (req, res) => {
  const { signalId, reason } = req.body
  const raisedByUserId = req.user?._id || req.user?.id
  const dispute = await DisputeModel.raiseDisputeService({ signalId, raisedByUserId, reason })
  return res.success(201, DISPUTE_MESSAGES.RAISED, dispute)
}

const getMine = async (req, res) => {
  const userId = req.user?._id || req.user?.id
  const data = await DisputeModel.getDisputesForUserService(userId)
  return res.success(200, DISPUTE_MESSAGES.FETCHED, data)
}

const adminResolve = async (req, res) => {
  const { id } = req.params
  const { decision, adminNote } = req.body
  const dispute = await DisputeModel.resolveDisputeService({ disputeId: id, decision, adminNote })
  return res.success(200, DISPUTE_MESSAGES.RESOLVED, dispute)
}

const adminListAll = async (req, res) => {
  const { status } = req.query
  const data = await DisputeModel.listAllDisputesService({ status })
  return res.success(200, DISPUTE_MESSAGES.FETCHED, data)
}

const DisputeController = { raise, getMine, adminResolve, adminListAll }

export default DisputeController
