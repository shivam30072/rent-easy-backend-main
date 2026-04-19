import { documentModel } from './Document.Schema.js'
import { convertToObjectId } from '../../helper/index.js'

const createDocument = async (documentData) => {
  if(!documentData.uniqueNumber){
    documentData.uniqueNumber = `${Date.now()}`
  }

  const exists = await documentModel.findOne({
    docType: documentData.docType,
    uniqueNumber: documentData.uniqueNumber
  }).lean()

  if (exists) {
    const err = new Error(`${documentData.docType} with this number already exists`)
    err.statusCode = 409
    throw err
  }

  return await documentModel.create(documentData)
}

const getDocuments = async (filter = {}) => {
  return await documentModel.find(filter).lean()
}

const getDocumentById = async (id) => {
  return await documentModel.findById(convertToObjectId(id)).lean()
}

const updateDocumentById = async (documentId, documentData) => {
  if (documentData.docType && documentData.uniqueNumber) {
    const exists = await documentModel.findOne({
      docType: documentData.docType,
      uniqueNumber: documentData.uniqueNumber,
      _id: { $ne: convertToObjectId(documentId) }
    }).lean()

    if (exists) {
      const err = new Error(`${documentData.docType} with this number already exists`)
      err.statusCode = 409
      throw err
    }
  }

  return await documentModel.findByIdAndUpdate(
    convertToObjectId(documentId),
    { $set: documentData },
    { new: true }
  )
}


const deleteDocumentById = async (id) => {
  return await documentModel.findByIdAndDelete({ _id: convertToObjectId(id) })
}

const getAllDocumentsByUserId = async (userId, docType) => {
  const filter = { userId: convertToObjectId(userId) }
  if (docType) filter.docType = docType
  return await documentModel.find(filter).sort({ uploadedAt: -1 }).lean()
}

const updateDocumentsByUserId = async (userId, documentData) => {
  return await documentModel.updateMany(
    { userId: convertToObjectId(userId) },
    { $set: documentData },
    { new: true }
  )
}

const deleteDocumentsByUserId = async (userId) => {
  return await documentModel.deleteMany({ userId: convertToObjectId(userId) })
}

const getDocumentByType = async ( docType, uniqueNumber) => {

return await documentModel.findOne({
  docType: { $regex: `^${docType}$`, $options: 'i' },
  uniqueNumber: uniqueNumber
}).lean()
}


const DocumentModel = {
  createDocument,
  getDocuments,
  getDocumentById,
  updateDocumentById,
  deleteDocumentById,
  getAllDocumentsByUserId,
  updateDocumentsByUserId,
  deleteDocumentsByUserId,
  getDocumentByType
}

export default DocumentModel
