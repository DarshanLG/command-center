import mongoose from 'mongoose';

const DailyLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  dayType: { type: String, default: "" },
  checks: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true, minimize: false });

DailyLogSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.models.DailyLog || mongoose.model('DailyLog', DailyLogSchema);