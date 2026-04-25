import OwnerModel from './Owner.Model.js'
import { OWNER_MESSAGES as MSG } from './Owner.Constant.js'

const createOwner = async (req, res) => {
  try {
    const owner = await OwnerModel.createOwner(req.body)
    return res.success(201, MSG.CREATED, owner)
  } catch (err) {
    res.status(400).json({ success: false, error: err.message })
  }
}

const getOwners = async (req, res) => {
  try {
    const owners = await OwnerModel.getOwners()
    return res.success(200, MSG.GET_OWNERS, owners)
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
}

const getOwnerById = async (req, res) => {
  try {
    const owner = await OwnerModel.getOwnerById(req.params.id)
    if (!owner) return res.status(404).json({ success: false, error: 'Owner not found' })

    return res.success(200, MSG.GET_OWNER, owner)
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
}

const getOwnerByUserId = async (req, res) => {
  try {
    const userId = req.body?.userId
    if (!userId) return res.status(400).json({ success: false, error: 'userId is required' })
    const owner = await OwnerModel.getOwnerByUserId(userId)
    if (!owner) return res.status(404).json({ success: false, error: 'Owner not found' })
    return res.success(200, MSG.GET_OWNER, owner)
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
}

const updateOwner = async (req, res) => {
  try {
    const updatedOwner = await OwnerModel.updateOwner(req.params.id, req.body)
    return res.success(200, MSG.UPDATED, updatedOwner)
  } catch (err) {
    res.status(400).json({ success: false, error: err.message })
  }
}

const deleteOwner = async (req, res) => {
  try {
    await OwnerModel.deleteOwner(req.params.id)
    return res.success(200, MSG.DELETED, {})
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
}

const getOwnerDashboard = async (req, res) => {
  try {
    const dashboard = await OwnerModel.getOwnerDashboard(req.params.ownerId)
    if (!dashboard) return res.status(404).json({ success: false, error: 'Owner not found' })
    return res.success(200, MSG.OWNER_DASHBOARD, dashboard)
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
}

const OwnerController = {
  createOwner,
  getOwners,
  getOwnerById,
  getOwnerByUserId,
  updateOwner,
  deleteOwner,
  getOwnerDashboard
}

export default OwnerController
