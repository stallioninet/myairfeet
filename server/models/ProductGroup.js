import mongoose from 'mongoose'

const productGroupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'productitem' }],
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
})

export default mongoose.model('productgroup', productGroupSchema)
