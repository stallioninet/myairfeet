import mongoose from 'mongoose'

const productSizeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true },
  sort_order: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
})

export default mongoose.model('productsize', productSizeSchema)
