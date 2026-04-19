// /**
//  * safeKey - returns sanitized key, optionally prefixing with folder and date
//  */
// export const safeKey = (prefix = '', filename = '') => {
//   const name = filename || `${Date.now()}`
//   const sanitized = name.replace(/[^a-zA-Z0-9-_.\/]/g, '_')
//   const folder = prefix ? prefix.replace(/(^\/|\/$)/g, '') : ''
//   const key = folder ? `${folder}/${sanitized}` : sanitized
//   return key
// }

import AWS from 'aws-sdk'
import { v4 as uuidv4 } from 'uuid'

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
})

const s3 = new AWS.S3()

const uploadFile = async (file) => {
  const fileExtension = file.originalname.split('.').pop()
  const fileKey = `uploads/${uuidv4()}.${fileExtension}`

  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileKey,
    Body: file.buffer,
    ContentType: file.mimetype,
  }

  const result = await s3.upload(params).promise()
  return { fileKey, url: result.Location }
}

const deleteFile = async (fileKey) => {
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileKey,
  }

  await s3.deleteObject(params).promise()
  return true
}

const listFiles = async () => {
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
  }

  const data = await s3.listObjectsV2(params).promise()
  const files = data.Contents.map((item) => ({
    key: item.Key,
    url: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${item.Key}`,
  }))
  return files
}

const uploadBase64File = async (base64, originalname, mimetype, prefix = 'uploads') => {
  const buffer = Buffer.from(base64, 'base64')
  const fileExtension = originalname.split('.').pop()
  const fileKey = `${prefix}/${uuidv4()}.${fileExtension}`

  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileKey,
    Body: buffer,
    ContentType: mimetype,
  }

  const result = await s3.upload(params).promise()
  return { fileKey, url: result.Location }
}

const uploadBufferToS3 = async (buffer, key, contentType) => {
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }
  const result = await s3.upload(params).promise()
  return { fileKey: key, url: result.Location }
}

export { uploadFile, deleteFile, listFiles, uploadBase64File, uploadBufferToS3 }