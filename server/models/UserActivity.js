import mongoose from 'mongoose'

const userActivitySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'app_user', required: true },
  action: {
    type: String,
    enum: ['login', 'create', 'update', 'delete'],
    required: true
  },
  module: { type: String, required: true },
  description: { type: String, required: true },
  ip_address: { type: String, default: '' },
  client_browser: { type: String, default: '' },
  url: { type: String, default: '' },
  referer_page: { type: String, default: '' },
  message: { type: String, default: '' },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
})

export default mongoose.model('useractivity', userActivitySchema)
