import axios from 'axios'
import FormData from 'form-data'

const getAuthHeader = () => {
  const clientId = process.env.DIGIO_CLIENT_ID
  const clientSecret = process.env.DIGIO_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('DIGIO_CLIENT_ID and DIGIO_CLIENT_SECRET must be set in env')
  }
  const token = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  return `Basic ${token}`
}

const getBaseUrl = () => {
  return process.env.DIGIO_BASE_URL || 'https://ext.digio.in:444'
}

/**
 * Upload an agreement PDF to Digio with e-stamp + eSign config.
 * Digio will SMS/email each signer a signing link (because send_sign_link: true).
 *
 * @param {Object} opts
 * @param {Buffer} opts.pdfBuffer - the PDF to upload
 * @param {string} opts.fileName - e.g. "rental-agreement-123.pdf"
 * @param {Array<{identifier:string,name:string,sign_type:string,reason:string}>} opts.signers
 * @param {number} opts.stampPaperValue - e.g. 100
 * @param {string} opts.stampPaperState - e.g. "KA"
 * @param {string} opts.reason - e.g. "Rental Agreement"
 * @param {number} opts.expireInDays - e.g. 7
 * @returns {Promise<{digioDocumentId: string, signerDetails: any[]}>}
 */
const uploadAgreementForSigning = async ({
  pdfBuffer,
  fileName,
  signers,
  stampPaperValue = 100,
  stampPaperState = 'KA',
  reason = 'Rental Agreement',
  expireInDays = 7,
}) => {
  if (!Array.isArray(signers) || signers.length === 0) {
    throw new Error('At least one signer is required')
  }

  const requestPayload = {
    signers: signers.map(s => ({
      identifier: s.identifier,
      name: s.name,
      sign_type: s.sign_type || 'aadhaar',
      reason: s.reason || reason,
    })),
    expire_in_days: expireInDays,
    display_on_page: 'custom',
    send_sign_link: true,
    notify_signers: true,
    generate_access_token: false,
    will_self_sign: false,
    file_name: fileName,
    reason,
    stamp_duty_info: {
      paper_value: stampPaperValue,
      state: stampPaperState,
    },
  }

  const form = new FormData()
  form.append('file', pdfBuffer, { filename: fileName, contentType: 'application/pdf' })
  form.append('request', JSON.stringify(requestPayload))

  const url = `${getBaseUrl()}/v2/client/document/upload`
  const headers = {
    ...form.getHeaders(),
    Authorization: getAuthHeader(),
  }

  const response = await axios.post(url, form, {
    headers,
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  })

  const data = response.data || {}
  const digioDocumentId = data.id || data.document_id
  if (!digioDocumentId) {
    throw new Error('Digio upload response missing document id')
  }

  return {
    digioDocumentId,
    signerDetails: data.signing_parties || data.signers || [],
  }
}

/**
 * Download a signed document from Digio as a Buffer.
 * @param {string} digioDocumentId
 * @returns {Promise<{buffer: Buffer}>}
 */
const downloadSignedDocument = async (digioDocumentId) => {
  const url = `${getBaseUrl()}/v2/client/document/${digioDocumentId}/download`
  const response = await axios.get(url, {
    headers: { Authorization: getAuthHeader() },
    responseType: 'arraybuffer',
  })
  return { buffer: Buffer.from(response.data) }
}

const digio = {
  uploadAgreementForSigning,
  downloadSignedDocument,
}

export default digio
export { uploadAgreementForSigning, downloadSignedDocument }
