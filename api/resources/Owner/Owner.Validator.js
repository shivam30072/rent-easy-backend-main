const validateCreateOwner = (req, res, next) => {
  const { userId, bankDetails } = req.body
  if (!userId) {
    return res.status(400).json({ success: false, error: "userId is required" })
  }
  if (bankDetails && (!bankDetails.accountHolderName || !bankDetails.accountNumber || !bankDetails.ifsc)) {
    return res.status(400).json({ success: false, error: "Incomplete bank details" })
  }
  next()
}

const OwnerValidator = {
  validateCreateOwner
}

export default OwnerValidator