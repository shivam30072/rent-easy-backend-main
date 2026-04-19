class AppError extends Error {
  constructor(message, statusCode = 500, name = 'AppError') {
    super(message)
    this.statusCode = statusCode
    this.name = name
    Error.captureStackTrace(this, this.constructor)
  }
}

export default AppError
