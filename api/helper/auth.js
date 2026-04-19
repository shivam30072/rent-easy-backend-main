import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export const hashPassword = async (password) => await bcrypt.hash(password, 10)
export const comparePassword = async (plain, hash) => await bcrypt.compare(plain, hash)

export const generateJWT = ({ userId }) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' })
}
