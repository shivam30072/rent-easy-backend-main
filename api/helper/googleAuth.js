import { OAuth2Client } from 'google-auth-library'

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

export const verifyGoogleToken = async (token) => {
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: process.env.GOOGLE_CLIENT_ID,
  })

  const payload = ticket.getPayload()
  return {
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
    sub: payload.sub, // This is the Google user ID
    email_verified: payload.email_verified,
  }
}
