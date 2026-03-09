import mongoose from 'mongoose'

const salesRepSchema = new mongoose.Schema({
  rep_number: { type: String, required: true, unique: true },
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  email: { type: String, required: true },
  username: { type: String, default: '' },
  password: { type: String, default: '' },
  phone: { type: String, default: '' },
  phones: [{
    number: { type: String, default: '' },
    ext: { type: String, default: '' },
    type: { type: String, enum: ['Main', 'Work', 'Desk', 'Home', 'Mobile'], default: 'Main' }
  }],
  territory: { type: String, default: '' },
  commission_rate: { type: Number, default: 0 },
  address: { type: String, default: '' },
  city: { type: String, default: '' },
  state: { type: String, default: '' },
  zip: { type: String, default: '' },
  addresses: [{
    label: { type: String, default: 'Address' },
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    zip: { type: String, default: '' },
    country: { type: String, default: 'United States' }
  }],
  start_date: { type: Date, default: null },
  about: { type: String, default: '' },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
})

export default mongoose.model('sales_rep', salesRepSchema)
