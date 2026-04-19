import { createClient } from 'redis'

const redisClient = createClient({
  url: 'rediss://red-d3qeh363jp1c738ig320:wvECStOIrX2WoN1wGHfQHuIzBaZB95fj@oregon-keyvalue.render.com:6379',
})

redisClient.on('error', (err) => {
  console.error('❌ Redis Client Error:', err)
})

try {
  await redisClient.connect()
  console.log('✅ Redis connected successfully')
} catch (error) {
  console.error('❌ Failed to connect to Redis on startup:', error.message)
}

/**
 * Set a value in Redis with optional TTL (in seconds)
 * @param {string} key
 * @param {string} value
 * @param {number} ttlInSec
 */
const setValue = async (key, value, ttlInSec = 0) => {
  if (ttlInSec > 0) {
    await redisClient.set(key, value, { EX: ttlInSec })
  } else {
    await redisClient.set(key, value)
  }
}

/**
 * Get a value from Redis
 * @param {string} key
 * @returns {string|null}
 */
const getValue = async (key) => {
  return await redisClient.get(key)
}

/**
 * Delete a key from Redis
 * @param {string} key
 * @returns {number} number of keys removed
 */
const deleteValue = async (key) => {
  return await redisClient.del(key)
}

/**
 * Check if a key exists
 * @param {string} key
 * @returns {boolean}
 */
const keyExists = async (key) => {
  const result = await redisClient.exists(key)
  return result === 1
}

/**
 * Increment a key’s value (default: 1)
 * @param {string} key
 * @returns {number} new incremented value
 */
const incrementValue = async (key) => {
  return await redisClient.incr(key)
}

/**
 * Expire a key manually
 * @param {string} key
 * @param {number} ttlInSec
 */
const expireKey = async (key, ttlInSec) => {
  await redisClient.expire(key, ttlInSec)
}

export {
  redisClient,
  setValue,
  getValue,
  deleteValue,
  keyExists,
  incrementValue,
  expireKey,
}

