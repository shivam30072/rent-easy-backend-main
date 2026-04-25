import { Queue } from '../helper/index.js'

// Bull connects to the same Redis instance as `api/helper/redis.js`.
// We parse the URL explicitly because Bull's URL parser doesn't reliably
// handle Redis 6 ACL `username:password@host` format with `rediss://` (TLS).
const REDIS_URL =
  process.env.REDIS_URL ||
  'rediss://red-d3qeh363jp1c738ig320:wvECStOIrX2WoN1wGHfQHuIzBaZB95fj@oregon-keyvalue.render.com:6379'

const u = new URL(REDIS_URL)
const reputationQueue = new Queue('reputation-tasks', {
  redis: {
    host: u.hostname,
    port: Number(u.port) || 6379,
    username: u.username || undefined,
    password: u.password || undefined,
    tls: u.protocol === 'rediss:' ? {} : undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  },
})

export default reputationQueue
