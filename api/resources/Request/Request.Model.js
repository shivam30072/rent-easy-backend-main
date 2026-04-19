import { requestModel } from './Request.Schema.js'
import AppError from '../../helper/AppError.js'
import { REQUEST_STATUS, MESSAGES } from './Request.Constant.js'
import ExcelJS from 'exceljs'
import path from 'path'
import fs from 'fs'
import { roomModel } from '../Room/Room.Schema.js'

const { NOT_FOUND, NOT_AUTHORIZED, INVALID_STATUS } = MESSAGES

const createRequestService = async (userId, { roomId, description }) => {
  const room = await roomModel.findById(roomId).populate('propertyId')
  if (!room) throw new AppError('Room not found', 404)

  const property = room.propertyId
  if (!property) throw new AppError('Property not found for this room', 404)

  return await requestModel.create({
    propertyId: property._id,
    roomId,
    description,
    ownerId: property.ownerId,
    status: REQUEST_STATUS.PENDING,
    raisedBy: userId
  })
}

const getRequestsForOwnerService = async (ownerId) => {
  return await requestModel.find({ ownerId }).populate('raisedBy', 'name email')
}

const getRequestsForUserService = async (userId) => {
  return await requestModel.find({ raisedBy: userId }).populate('ownerId', 'name email')
}

const acceptRequestService = async (ownerId, requestId) => {
  const req = await requestModel.findById(requestId)
  if (!req) throw new AppError(NOT_FOUND, 404)

  if (req.ownerId.toString() !== ownerId) throw new AppError(NOT_AUTHORIZED, 403)
  req.status = REQUEST_STATUS.ACCEPTED
  await req.save()
  return req
}

const completeRequestService = async (ownerId, requestId) => {
  const req = await requestModel.findById(requestId)
  if (!req) throw new AppError(NOT_FOUND, 404)
  if (req.ownerId.toString() !== ownerId) throw new AppError(NOT_AUTHORIZED, 403)
  req.status = REQUEST_STATUS.COMPLETED
  await req.save()
  return req
}

const rejectRequestService = async (ownerId, requestId) => {
  const req = await requestModel.findById(requestId)
  if (!req) throw new AppError(NOT_FOUND, 404)
  if (req.ownerId.toString() !== ownerId) throw new AppError(NOT_AUTHORIZED, 403)
  req.status = REQUEST_STATUS.REJECTED
  await req.save()
  return req
}

const deleteRequestService = async (userId, requestId) => {
  const req = await requestModel.findById(requestId)
  if (!req) throw new AppError(NOT_FOUND, 404)
  if (req.raisedBy.toString() !== userId) throw new AppError(NOT_AUTHORIZED, 403)
  if (req.status !== REQUEST_STATUS.PENDING) throw new AppError(INVALID_STATUS, 400)
  await requestModel.deleteOne({ _id: requestId })
  return { success: true }
}

const exportRequestsToExcelService = async (ownerId, { startDate, endDate, status, propertyId }) => {
  const filter = { ownerId }

  if (startDate && endDate) {
    filter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) }
  }
  if (status) {
    filter.status = status
  }
  if (propertyId) {
    filter.propertyId = propertyId
  }

  const requests = await requestModel.find(filter)
    .populate('raisedBy', 'name email phone')
    .populate('propertyId', 'name address')

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Requests Report')

  sheet.columns = [
    { header: 'Request ID', key: 'id', width: 25 },
    { header: 'Property Name', key: 'propertyName', width: 20 },
    { header: 'Address', key: 'address', width: 30 },
    { header: 'Room ID', key: 'roomId', width: 20 },
    { header: 'Description', key: 'description', width: 40 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Raised By', key: 'raisedBy', width: 20 },
    { header: 'Email', key: 'email', width: 25 },
    { header: 'Phone', key: 'phone', width: 15 },
    { header: 'Created At', key: 'createdAt', width: 20 }
  ]

  requests.forEach(req => {
    sheet.addRow({
      id: req._id.toString(),
      propertyName: req.propertyId?.name || '',
      address: req.propertyId?.address || '',
      roomId: req.roomId || '',
      description: req.description,
      status: req.status,
      raisedBy: req.raisedBy?.name || '',
      email: req.raisedBy?.email || '',
      phone: req.raisedBy?.phone || '',
      createdAt: req.createdAt.toISOString()
    })
  })

  const reportsDir = path.join(process.cwd(), 'reports')
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir)
  }

  const filePath = path.join(reportsDir, `requests_report_${Date.now()}.xlsx`)
  await workbook.xlsx.writeFile(filePath)
  return filePath
}

const RequestModel = {
  createRequestService,
  getRequestsForOwnerService,
  getRequestsForUserService,
  acceptRequestService,
  completeRequestService,
  rejectRequestService,
  deleteRequestService,
  exportRequestsToExcelService
}

export default RequestModel
