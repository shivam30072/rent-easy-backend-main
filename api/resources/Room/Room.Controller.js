import RoomModel  from './Room.Model.js'
import { ROOM_MESSAGES as MSG } from './Room.Constant.js'

const createRoom = async (req, res) => {
  try {
    const room = await RoomModel.createRoom(req.body)
    return res.success(201, MSG.CREATED, room)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const getRooms = async (req, res) => {
  try {
    const { query = {}, page, limit } = req.body
    const rooms = await RoomModel.getRooms(query, { page, limit })
    return res.success(200, MSG.ALL, rooms)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const getRoomById = async (req, res) => {
  try {
    const room = await RoomModel.getRoomById(req.body.roomId)
    if (!room) return res.status(404).json({ message: MSG.NOT_FOUND })
    return res.success(200, MSG.ROOM_FETCHED, room)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const updateRoomById = async (req, res) => {
  try {
    const updated = await RoomModel.updateRoomById(req.body.roomId, req.body.roomData)
    if (!updated) return res.status(404).json({ message: MSG.NOT_FOUND })
    return res.success(200, MSG.UPDATED, updated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const deleteRoomById = async (req, res) => {
  try {
    const deleted = await RoomModel.deleteRoomById(req.body.roomId)
    if (!deleted) return res.status(404).json({ message: MSG.NOT_FOUND })
    return res.success(200, MSG.DELETED, deleted)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const assignTenant = async (req, res) => {
  try {
    const room = await RoomModel.assignTenant(req.body)

    return res.success(200, MSG.TENANT_ASSIGNED, room)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const vacateTenant = async (req, res) => {
  try {
    const room = await RoomModel.vacateTenant(req.body.roomId)
    return res.success(200, MSG.TENANT_VACATED, room)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const RoomController = { 
  createRoom,
  getRooms,
  getRoomById,
  updateRoomById,
  deleteRoomById,
  assignTenant, 
  vacateTenant 
}

export default RoomController
