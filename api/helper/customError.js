// customError.js
import http from 'http'

/** ================= CONFIG ================= */
const { npm_package_name: pkgName = '', npm_package_version: pkgVersion = '' } = process.env
export const SERVICE = `${pkgName}@${pkgVersion}`

/** ================= TYPES (JSDoc only) ================= */
/**
 * @typedef {Object} CustomErrorMap
 * @property {string} [message] - The error message.
 * @property {number} [statusCode] - The HTTP status code.
 * @property {string} [errorCode] - The error code.
 * @property {string} [code] - Alternate code.
 * @property {*} [data] - Additional data.
 */

/** ================= DEFAULTS ================= */
const DEFAULT_ERROR_MSG = 'Unhandled Error'
const DEFAULT_ERROR_STATUS_CODE = 500
const DEFAULT_ERROR_CODE = 'ExpsUtls::GENERIC'

/** ================= RESPONSE BODY ================= */
export class ResponseBody {
  /**
   * @param {?number} [statusCode]
   * @param {?string} [message]
   * @param {?*} [data]
   * @param {?*} [error]
   * @param {?string} [errorCode]
   */
  constructor(statusCode, message, data, error, errorCode) {
    this.statusCode = statusCode || DEFAULT_ERROR_STATUS_CODE
    this.status = http.STATUS_CODES[this.statusCode] || 'Internal Server Error'
    this.message = message || (statusCode && this.status) || DEFAULT_ERROR_MSG
    this.data = data
    this.error = error
    this.errorCode = error && (errorCode || DEFAULT_ERROR_CODE)
  }
}

/** ================= CUSTOM ERROR ================= */
export default class CustomError extends Error {
  /** @type {boolean} */
  _isCustomError = true
  /** @type {string} */
  service = SERVICE
  /** @type {string} */
  message = DEFAULT_ERROR_MSG
  /** @type {number} */
  statusCode = DEFAULT_ERROR_STATUS_CODE
  /** @type {string} */
  errorCode = DEFAULT_ERROR_CODE
  /** @type {*} */
  error
  /** @type {*} */
  data

  /**
   * @param {*} [e] - Any Error instance or object
   * @param {CustomErrorMap} [eMap] - Error mapping for custom info
   */
  constructor(e, eMap) {
    if (e?._isCustomError && !eMap) {
      return e
    }

    super()

    this.message = eMap?.message || e?.message || DEFAULT_ERROR_MSG
    this.statusCode = eMap?.statusCode || e?.statusCode || DEFAULT_ERROR_STATUS_CODE
    this.errorCode = eMap?.errorCode || e?.errorCode || e?.code || DEFAULT_ERROR_CODE
    this.error = e
    this.data = eMap?.data || e?.data || undefined
  }
}
