import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  username: { type: String, default: '' },
  password: { type: String, default: '' },
  phone: { type: String, default: null },
  extension: { type: String, default: '' },
  country_code: { type: String, default: '' },
  level: {
    type: String,
    enum: ['superuser', 'admin', 'sales-rep', 'data-entry'],
    default: 'data-entry'
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  notes: { type: String, default: null },
  last_login: { type: Date, default: null },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
})

export default mongoose.model('app_user', userSchema)
