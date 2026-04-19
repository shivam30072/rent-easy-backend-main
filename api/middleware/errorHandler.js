import AppError from '../helper/AppError.js'

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500
  const message = err.message || 'Internal Server Error'

  res.status(statusCode).json({
    success: false,
    statusCode: statusCode,
    error: {
      name: err.name,
      message: message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    },
  })
}

export default errorHandler