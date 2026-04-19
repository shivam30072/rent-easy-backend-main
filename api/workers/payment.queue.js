import { Queue } from '../helper/index.js'

const paymentQueue = new Queue('payment-tasks', {
  redis: { host: process.env.REDIS_HOST, port: process.env.REDIS_PORT }
})

export default paymentQueue
