import mongoose from 'mongoose'

const pilotProgramSchema = new mongoose.Schema({
  customer_id: { type: String, default: '' },
  customer_name: { type: String, required: true },
  quantity: { type: Number, default: 0 },
  program_cost: { type: Number, default: 0 },
  payment_status: { type: String, enum: ['paid', 'outstanding'], default: 'outstanding' },
  paid_date: { type: Date, default: null },
  paid_amount: { type: Number, default: 0 },
  before_data: { type: String, default: '' },
  after_data: { type: String, default: '' },
  documents: [{
    filename: String,
    original_name: String,
    category: { type: String, enum: ['reports', 'photos', 'results', 'agreements'], default: 'reports' },
    size: Number,
    uploaded_at: { type: Date, default: Date.now },
  }],
  notes: { type: String, default: '' },
  sales_rep_id: { type: String, default: '' },
  sales_rep_name: { type: String, default: '' },
  start_date: { type: Date, default: null },
  end_date: { type: Date, default: null },
  status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})

export default mongoose.model('PilotProgram', pilotProgramSchema)
