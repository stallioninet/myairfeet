import mongoose from 'mongoose'

const userLevelSchema = new mongoose.Schema({
  name: { type: String, required: true },
  key: { type: String, required: true, unique: true },
  icon: { type: String, default: 'bi-star-fill' },
  icon_bg: { type: String, default: '#eff6ff' },
  icon_color: { type: String, default: '#2563eb' },
  description: { type: String, default: '' },
  permissions: [{ type: String }],
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
})

export default mongoose.model('userlevel', userLevelSchema)
