import mongoose from 'mongoose'

const levelPrivilegeSchema = new mongoose.Schema({
  level: { type: mongoose.Schema.Types.ObjectId, ref: 'user_level', required: true },
  privileges: [{ type: mongoose.Schema.Types.ObjectId, ref: 'privilege' }],
}, { _id: false })

const userAccessSchema = new mongoose.Schema({
  // Mixed type: holds a real user ObjectId for per-user access,
  // OR a "level_<key>" string for level-default access rules.
  user: { type: mongoose.Schema.Types.Mixed, required: true, unique: true },
  access: [levelPrivilegeSchema],
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
})

export default mongoose.model('useraccess', userAccessSchema)
