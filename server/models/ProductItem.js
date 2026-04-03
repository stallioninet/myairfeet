import mongoose from 'mongoose'

const productItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  item_type: { type: mongoose.Schema.Types.ObjectId, ref: 'itemtype', required: true },
  unit_price: { type: Number, default: 0 },
  base_price: { type: Number, default: 0 },
  website_price: { type: Number, default: 0 },
  website_price_type: { type: String, enum: ['fixed', 'percent'], default: 'fixed' },
  msrp: { type: Number, default: 0 },
  msrp_type: { type: String, enum: ['fixed', 'percent'], default: 'fixed' },
  distributor_price: { type: Number, default: 0 },
  distributor_price_type: { type: String, enum: ['fixed', 'percent'], default: 'fixed' },
  retail_store_price: { type: Number, default: 0 },
  retail_store_price_type: { type: String, enum: ['fixed', 'percent'], default: 'fixed' },
  manufacturing_cost: { type: Number, default: 0 },
  shipping_cost: { type: Number, default: 0 },
  duties: { type: Number, default: 0 },
  packaging: { type: Number, default: 0 },
  labor: { type: Number, default: 0 },
  other_expenses: { type: Number, default: 0 },
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
