export const isKycVerified = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  if (!req.user.kycVerified) {
    return res.status(403).json({ error: 'KYC verification required before using this feature' })
  }

  next()
}
