import {
  mongoose,
  dotenv,
  jwt,
  bcrypt,
  moment,
  fs,
  path,
  express,
  PDFDocument,
  streamBuffers,
  nodemailer,
  Queue,
  Handlebars,
  dayjs,
  puppeteer,
  crypto
} from './lib.js'
import configureRouter from './configureRouter.js'
import asyncHandler from 'express-async-handler'
import { exportToCSV } from './csv.js'
import AppError from './AppError.js'
import { logger } from './logger.js'
import CustomError from './customError.js'

import {
  redisClient,
  setValue,
  getValue,
  deleteValue,
  keyExists,
  incrementValue,
  expireKey
} from './redis.js'

import {
    hashPassword,
    comparePassword,
    isResetTokenUsed,
    markTokenAsUsed,
    computePenalty
} from './utils.js'

import expressAsync   from './expressAsync.js'
import { isRentDueWithinDays } from './date.js'

import { generateResetToken, sendResetEmail } from './mailer.js'
import { verifyGoogleToken } from './googleAuth.js'
import { generateToken, verifyToken } from './jwtHelper.js'

function convertToObjectId(idString) {
    try {
        const objectId = new mongoose.Types.ObjectId(idString)
        return objectId
    } catch (error) {
        console.error('Invalid ObjectId string:', idString)
        throw error
    }
}

function removeId(data) {
  return deepClean(data, { removeId: true })
}

function removeVersion(data) {
  return deepClean(data, { removeVersion: true })
}

function removeIdAndVersion(data) {
  return deepClean(data, { removeId: true, removeVersion: true })
}

function isPlainObject(obj) {
  return Object.prototype.toString.call(obj) === '[object Object]'
}

function deepClean(data, options = { removeId: false, removeVersion: false }, seen = new WeakSet()) {
  if (Array.isArray(data)) {
    return data.map(item => deepClean(item, options, seen))
  }

  if (data !== null && typeof data === 'object') {
    if (seen.has(data)) {
      return data
    }
    seen.add(data)

    if (!isPlainObject(data)) {
      return data
    }

    const cleaned = {}
    for (const key in data) {
      if (Object.hasOwn(data, key)) {
        if (options.removeId && key === '_id') continue
        if (options.removeVersion && key === '__v') continue

        cleaned[key] = deepClean(data[key], options, seen)
      }
    }
    return cleaned
  }

  return data
}

export {
  mongoose,
  dotenv,
  jwt,
  bcrypt,
  moment,
  fs,
  path,
  express,
  convertToObjectId,
  removeIdAndVersion,
  removeVersion,
  removeId,
  generateResetToken,
  verifyGoogleToken,
  generateToken,
  verifyToken,
  sendResetEmail,
  asyncHandler,
  redisClient,
  setValue,
  getValue,
  deleteValue,
  keyExists,
  incrementValue,
  expireKey,
  hashPassword,
  comparePassword,
  isResetTokenUsed,
  markTokenAsUsed,
  expressAsync,
  isRentDueWithinDays,
  PDFDocument,
  streamBuffers,
  nodemailer,
  Queue,
  Handlebars,
  dayjs,
  puppeteer,
  computePenalty,
  exportToCSV,
  AppError,
  logger,
  crypto,
  configureRouter,
  CustomError
}