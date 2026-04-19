const ENABLE_VALIDATION = process.env.ENABLE_VALIDATION === "true"

const validateCreateDocument = (req, res, next) => {
  if (!ENABLE_VALIDATION) return next()

  const { documentData } = req.body
  if (!documentData) {
    return res.status(400).json({ message: "documentData is required" })
  }

  const { userId, docType, uniqueNumber, documentUrl } = documentData

  if (!userId) return res.status(400).json({ message: "userId is required" })
  if (!docType) return res.status(400).json({ message: "docType is required" })
  if (!uniqueNumber) return res.status(400).json({ message: "uniqueNumber is required" })
  if (!documentUrl) return res.status(400).json({ message: "documentUrl is required" })

  next()
}

const validateUpdateDocumentById = (req, res, next) => {
  if (!ENABLE_VALIDATION) return next()

  const { documentId, documentData } = req.body
  if (!documentId) return res.status(400).json({ message: "documentId is required" })
  if (!documentData) return res.status(400).json({ message: "documentData is required" })

  next()
}

const validateGetDocumentById = (req, res, next) => {
  if (!ENABLE_VALIDATION) return next()

  const { documentId } = req.body
  if (!documentId) return res.status(400).json({ message: "documentId is required" })

  next()
}

const validateGetAllDocumentsByUserId = (req, res, next) => {
  if (!ENABLE_VALIDATION) return next()

  const { userId } = req.body
  if (!userId) return res.status(400).json({ message: "userId is required" })

  next()
}

const validateUpdateDocumentsByUserId = (req, res, next) => {
  if (!ENABLE_VALIDATION) return next()

  const { userId, documentData } = req.body
  if (!userId) return res.status(400).json({ message: "userId is required" })
  if (!documentData) return res.status(400).json({ message: "documentData is required" })

  next()
}

const validateDeleteDocument = (req, res, next) => {
  if (!ENABLE_VALIDATION) return next()

  const { documentId } = req.body
  if (!documentId) return res.status(400).json({ message: "documentId is required" })

  next()
}

const validateDeleteDocumentsByUserId = (req, res, next) => {
  if (!ENABLE_VALIDATION) return next()

  const { userId } = req.body
  if (!userId) return res.status(400).json({ message: "userId is required" })

  next()
}

const validateGetDocumentByType = (req, res, next) => {
  if (!ENABLE_VALIDATION) return next()

  const {  documentType, uniqueNumber } = req.body

  if (!documentType) return res.status(400).json({ message: "documentType is required" })
  if (!uniqueNumber) return res.status(400).json({ message: "uniqueNumber is required" })

  next()
}

const DocumentValidator = {
  validateCreateDocument,
  validateUpdateDocumentById,
  validateGetDocumentById,
  validateGetAllDocumentsByUserId,
  validateUpdateDocumentsByUserId,
  validateDeleteDocument,
  validateDeleteDocumentsByUserId,
  validateGetDocumentByType
}

export default DocumentValidator