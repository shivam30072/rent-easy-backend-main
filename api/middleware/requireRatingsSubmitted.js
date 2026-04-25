import RatingExchangeModel from '../resources/RatingExchange/RatingExchange.Model.js'

// Returns 403 with `{requiresRating: true, exchangeId}` if the user has any pending
// rating exchange where they haven't submitted yet. Frontend deep-links to the
// rating screen on this response.
//
// Must run AFTER authMiddleware.

export const requireRatingsSubmitted = async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' })

    const pending = await RatingExchangeModel.getPendingForUserService(req.user._id || req.user.id)
    if (pending.length === 0) return next()

    const oldest = pending[0]
    return res.status(403).json({
      success: false,
      message: 'Please submit your pending rating before continuing',
      requiresRating: true,
      exchangeId: oldest._id,
    })
  } catch (err) {
    console.error('[requireRatingsSubmitted] error:', err.message)
    // Fail open — don't block legitimate users on a middleware crash.
    next()
  }
}
