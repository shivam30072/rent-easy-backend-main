const ENABLE_VALIDATION = process.env.ENABLE_VALIDATION === 'true'

const validateCreateRoom = (req, res, next) => {
  if (!ENABLE_VALIDATION) return next()
  const data = req.body.roomData || {}
  if (!data.propertyId) return res.status(400).json({ message: 'propertyId is required' })
  if (!data.roomType) return res.status(400).json({ message: 'roomType is required' })
  if (data.rent === undefined) return res.status(400).json({ message: 'rent is required' })
  next()
}

const validateUpdateRoom = (req, res, next) => {
  if (!ENABLE_VALIDATION) return next()
  if (!req.body.roomId) return res.status(400).json({ message: 'roomId is required' })
  if (!req.body.roomData) return res.status(400).json({ message: 'roomData is required' })
  next()
}

const validateGetRoomById = (req, res, next) => {
  if (!ENABLE_VALIDATION) return next()
  if (!req.body.roomId) return res.status(400).json({ message: 'roomId is required' })
  next()
}

const RoomValidator = {
  validateCreateRoom,
  validateUpdateRoom,
  validateGetRoomById
}

export default RoomValidator