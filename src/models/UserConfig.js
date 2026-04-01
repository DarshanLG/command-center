import mongoose from 'mongoose';

const UserConfigSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

  // All config stored as plain JSON — no Map types, no subdocument schemas
  // This avoids Mongoose Map serialization bugs with .lean() and upserts
  graduationDate: { type: String, default: "" },
  interviewReadyDate: { type: String, default: "" },
  dashboardTitle: { type: String, default: "COMMAND CENTER" },
  footerText: { type: String, default: "" },
  officeRules: { type: String, default: "" },

  // These are stored as raw JSON objects — Mixed type = no schema enforcement
  colorMap: { type: mongoose.Schema.Types.Mixed, default: {} },
  dayTypes: { type: mongoose.Schema.Types.Mixed, default: {} },
  phases: { type: [mongoose.Schema.Types.Mixed], default: [] },
  checks: { type: [mongoose.Schema.Types.Mixed], default: [] },
  officeSchedule: { type: [mongoose.Schema.Types.Mixed], default: [] },

}, { timestamps: true, minimize: false });

export default mongoose.models.UserConfig || mongoose.model('UserConfig', UserConfigSchema);
