import jwt from 'jsonwebtoken'
import { userModel } from '../resources/User/User.Schema.js'

export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) throw new Error('No token provided')

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    console.log('AUTH DEBUG - decoded keys:', Object.keys(decoded))
    console.log('AUTH DEBUG - _id:', decoded._id, 'userId:', decoded.userId, 'id:', decoded.id)
    const user = await userModel.findById(decoded._id || decoded.userId || decoded.id)
    if (!user) throw new Error('Invalid token')

    req.user = user
    next()
  } catch (err) {
    console.error('AUTH DEBUG - error:', err.message)
    return res.status(401).json({ success: false, message: err.message })
  }
}
