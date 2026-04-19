import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import { createAdapter } from '@socket.io/redis-adapter'
import { createClient } from 'redis'
import { userModel } from '../resources/User/User.Schema.js'

let io = null

const setupSocketIO = async (httpServer) => {
  io = new Server(httpServer, {
    cors: { origin: '*' },
    pingTimeout: 60000,
  })

  // Redis adapter for pub/sub
  try {
    const pubClient = createClient({
      url: process.env.REDIS_URL || 'rediss://red-d3qeh363jp1c738ig320:wvECStOIrX2WoN1wGHfQHuIzBaZB95fj@oregon-keyvalue.render.com:6379',
    })
    const subClient = pubClient.duplicate()
    await Promise.all([pubClient.connect(), subClient.connect()])
    io.adapter(createAdapter(pubClient, subClient))
    console.log('✅ Socket.IO Redis adapter connected')
  } catch (err) {
    console.warn('⚠️ Socket.IO Redis adapter failed, using default:', err.message)
  }

  // JWT authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token
      if (!token) return next(new Error('No token provided'))

      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const user = await userModel.findById(decoded._id || decoded.userId)
      if (!user) return next(new Error('Invalid token'))

      socket.user = { _id: user._id.toString(), name: user.name }
      next()
    } catch (err) {
      next(new Error('Authentication failed'))
    }
  })

  // Register event handlers
  const { registerChatHandlers } = await import('../resources/Chat/Chat.Socket.js')
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.user.name} (${socket.user._id})`)
    registerChatHandlers(io, socket)

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.user.name}`)
    })
  })

  return io
}

const getIO = () => {
  if (!io) throw new Error('Socket.IO not initialized')
  return io
}

export { setupSocketIO, getIO }
