import mongoose from 'mongoose'

const itemSizeMapSchema = new mongoose.Schema({
  product_item: { type: mongoose.Schema.Types.ObjectId, ref: 'productitem', required: true },
  size: { type: mongoose.Schema.Types.ObjectId, ref: 'productsize', required: true },
  sku: { type: String, default: '' },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
})

export default mongoose.model('itemsizemap', itemSizeMapSchema)
