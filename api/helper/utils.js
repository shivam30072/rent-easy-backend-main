import bcrypt from 'bcryptjs'

import { getValue, setValue } from './redis.js'

const hashPassword = async (password) => {
  return await bcrypt.hash(password, 10)
}

const comparePassword = async (plainText, hashedPassword) => {
  return await bcrypt.compare(plainText, hashedPassword)
}

const isResetTokenUsed = async (token) => {
  const key = `used_reset_token:${token}`
  const alreadyUsed = await getValue(key)
  return alreadyUsed
}

const markTokenAsUsed = async (token, ttl = 900) => {
  const key = `used_reset_token:${token}`
  await setValue(key, 'used', ttl)
}

const computePenalty = (amount, daysLate, penaltyPercentPerDay) => {
  if (!daysLate || daysLate <= 0) return 0
  const amt = Number(amount) || 0
  const p = Number(penaltyPercentPerDay) || 0
  return (amt * (p/100) * daysLate)
}

export {
    hashPassword,
    comparePassword,
    isResetTokenUsed,
    markTokenAsUsed,
    computePenalty
}