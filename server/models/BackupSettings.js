import mongoose from 'mongoose'

const backupSettingsSchema = new mongoose.Schema({
  auto_backup: { type: Boolean, default: true },
  frequency: { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'daily' },
  retention: { type: Number, default: 30 },
  email_notifications: { type: Boolean, default: true },
  compression: { type: Boolean, default: true },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
})

export default mongoose.model('backupsettings', backupSettingsSchema)
