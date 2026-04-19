const asyncHandler = (fn) => {
  return function (...args) {
    const fnReturn = fn(...args)
    return Promise.resolve(fnReturn).catch(args[2]) // args[2] is next
  }
}

export default asyncHandler
