import RequestModel from './Request.Model.js'
import { REQUEST_MESSAGES } from './Request.Constant.js'

const createRequest = async (req, res) => {
  const tenantId = req?.user?.id || req.body.userId
  const data = await RequestModel.createRequestService(tenantId, req.body)
  return res.success(201, REQUEST_MESSAGES.CREATED, data)
}

const getRequestsForOwner = async (req, res) => {
  const ownerId = req?.user?.id || req.query.ownerId || req.body.ownerId
  const data = await RequestModel.getRequestsForOwnerService(ownerId)
  return res.success(200, REQUEST_MESSAGES.FETCHED, data)
}

const getRequestsForUser = async (req, res) => {
  const tenantId = req?.user?.id || req.body.tenantId
  const data = await RequestModel.getRequestsForUserService(tenantId)
  return res.success(200, REQUEST_MESSAGES.FETCHED, data)
}

const acceptRequest = async (req, res) => {
  const ownerId = req?.user?.id || req.body.ownerId
  const data = await RequestModel.acceptRequestService(ownerId, req.params.id)
  return res.success(200, REQUEST_MESSAGES.ACCEPTED, data)
}

const completeRequest = async (req, res) => {
  const ownerId = req?.user?.id || req.body.ownerId
  const data = await RequestModel.completeRequestService(ownerId, req.params.id)
  return res.success(200, REQUEST_MESSAGES.COMPLETED, data)
}

const rejectRequest = async (req, res) => {
  const ownerId = req?.user?.id || req.body.ownerId
  const data = await RequestModel.rejectRequestService(ownerId, req.params.id)
  return res.success(200, REQUEST_MESSAGES.REJECTED, data)
}

const deleteRequest = async (req, res) => {
  const ownerId = req?.user?.id || req.body.ownerId
  const data = await RequestModel.deleteRequestService(ownerId, req.params.id)
  return res.success(200, REQUEST_MESSAGES.DELETED, data)
}

const exportRequestsToExcel = async (req, res) => {
  const ownerId = req?.user?.id || req.body.ownerId
  const filePath = await RequestModel.exportRequestsToExcelService(ownerId, req.query)
  return res.download(filePath, 'requests_report.xlsx')
}

const RequestController = {
  createRequest,
  getRequestsForOwner,
  getRequestsForUser,
  acceptRequest,
  completeRequest,
  rejectRequest,
  deleteRequest,
  exportRequestsToExcel
}

export default RequestController
