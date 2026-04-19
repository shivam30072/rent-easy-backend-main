const ENABLE_VALIDATION = process.env.ENABLE_VALIDATION === 'true'

const validateGetByUser = (req, res, next) => {
  if (!ENABLE_VALIDATION) return next()
  if (!req.body.userId) return res.status(400).json({ message: 'userId is required' })
  next()
}

const validateMarkRead = (req, res, next) => {
  if (!ENABLE_VALIDATION) return next()
  if (!req.body.notificationIds && !req.body.userId) {
    return res.status(400).json({ message: 'notificationIds or userId is required' })
  }
  next()
}

const NotificationValidator = {
  validateGetByUser,
  validateMarkRead
}

export default NotificationValidator