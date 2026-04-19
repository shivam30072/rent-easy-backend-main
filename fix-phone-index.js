import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

async function fixPhoneIndex() {
  try {
    await mongoose.connect(process.env.MONGO_URI)
    console.log('✅ Connected to MongoDB')

    const db = mongoose.connection.db
    const collection = db.collection('users')

    // List current indexes
    const indexes = await collection.indexes()
    console.log('Current indexes:', indexes.map(i => i.name))

    // Drop the old non-sparse phone index if it exists
    try {
      await collection.dropIndex('phone_1')
      console.log('✅ Dropped old phone_1 index')
    } catch (e) {
      console.log('ℹ️  phone_1 index not found or already dropped:', e.message)
    }

    // Recreate as sparse unique index
    await collection.createIndex({ phone: 1 }, { unique: true, sparse: true })
    console.log('✅ Created new sparse unique phone index')

    console.log('🎉 Done! Restart your backend now.')
    process.exit(0)
  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  }
}

// fixPhoneIndex()
