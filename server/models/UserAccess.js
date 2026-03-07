import mongoose from 'mongoose'

const levelPrivilegeSchema = new mongoose.Schema({
  level: { type: mongoose.Schema.Types.ObjectId, ref: 'user_level', required: true },
  privileges: [{ type: mongoose.Schema.Types.ObjectId, ref: 'privilege' }],
}, { _id: false })

const userAccessSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'app_user', required: true, unique: true },
  access: [levelPrivilegeSchema],
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
})

export default mongoose.model('useraccess', userAccessSchema)
