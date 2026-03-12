import mongoose from 'mongoose'

const productItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  item_type: { type: mongoose.Schema.Types.ObjectId, ref: 'itemtype', required: true },
  unit_price: { type: Number, default: 0 },
  base_price: { type: Number, default: 0 },
  notes: { type: String, default: '' },
  sort_order: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
})

export default mongoose.model('productitem', productItemSchema)
