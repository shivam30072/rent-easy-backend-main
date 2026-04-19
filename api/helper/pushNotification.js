import admin from 'firebase-admin'
import DeviceTokenModel from '../resources/DeviceToken/DeviceToken.Model.js'

let firebaseInitialized = false

const initFirebase = () => {
  if (firebaseInitialized) return
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!serviceAccount) {
    console.warn('FIREBASE_SERVICE_ACCOUNT env var not set — push notifications disabled')
    return
  }
  try {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(serviceAccount))
    })
    firebaseInitialized = true
  } catch (err) {
    console.error('Firebase init failed:', err.message)
  }
}

const sendPushNotification = async (userId, title, body, data = {}) => {
  initFirebase()
  if (!firebaseInitialized) {
    console.warn('Push skipped — Firebase not initialized')
    return
  }

  console.log('Push notification: looking up tokens for userId:', userId)
  const tokens = await DeviceTokenModel.getTokensForUserService(userId)
  console.log('Push notification: found tokens:', tokens.length, tokens)
  if (!tokens.length) {
    console.warn('Push skipped — no device tokens for user:', userId)
    return
  }

  const message = {
    notification: { title, body },
    data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
    tokens
  }

  try {
    const response = await admin.messaging().sendEachForMulticast(message)
    console.log('Push notification result:', JSON.stringify(response.responses.map(r => ({ success: r.success, error: r.error?.code }))))
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        console.error('Push failed for token:', tokens[idx], 'error:', resp.error?.code, resp.error?.message)
        if (resp.error?.code === 'messaging/registration-token-not-registered') {
          DeviceTokenModel.removeStaleTokenService(tokens[idx])
        }
      }
    })
  } catch (err) {
    console.error('Push notification error:', err.message)
  }
}

export { sendPushNotification }
