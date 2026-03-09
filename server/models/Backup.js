import mongoose from 'mongoose'

const backupSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  size: { type: Number, default: 0 },
  type: { type: String, enum: ['full', 'incremental'], default: 'full' },
  duration: { type: Number, default: 0 },
  status: { type: String, enum: ['success', 'failed', 'in_progress'], default: 'success' },
  collections: { type: Number, default: 0 },
  records: { type: Number, default: 0 },
  gridfs_id: { type: mongoose.Schema.Types.ObjectId, default: null },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
})

export default mongoose.model('backup', backupSchema)
