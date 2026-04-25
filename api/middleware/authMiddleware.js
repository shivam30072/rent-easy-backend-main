import jwt from 'jsonwebtoken'
import { userModel } from '../resources/User/User.Schema.js'

export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) throw new Error('No token provided')

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await userModel.findById(decoded._id || decoded.userId || decoded.id)
    if (!user) throw new Error('Invalid token')

    req.user = user
    next()
  } catch (err) {
    return res.status(401).json({ success: false, message: err.message })
  }
}

export const requireRole = (allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' })
  }
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Forbidden: insufficient role' })
  }
  next()
}
