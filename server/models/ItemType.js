import mongoose from 'mongoose'

const itemTypeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  icon: { type: String, default: 'bi-box-seam' },
  icon_bg: { type: String, default: '#dbeafe' },
  icon_color: { type: String, default: '#1d4ed8' },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
})

export default mongoose.model('itemtype', itemTypeSchema)
