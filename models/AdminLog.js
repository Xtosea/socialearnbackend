import mongoose from 'mongoose';
const { Schema } = mongoose;

const AdminLogSchema = new Schema({
  adminId: { type: Schema.Types.ObjectId, ref: 'User' },
  action: String,
  targetUser: { type: Schema.Types.ObjectId, ref: 'User' },
  amount: Number,
  reason: String,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('AdminLog', AdminLogSchema);