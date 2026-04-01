import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String },
  weekPlan: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true, minimize: false });

export default mongoose.models.User || mongoose.model('User', UserSchema);