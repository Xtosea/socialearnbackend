// models/Task.js
import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },

    type: {
  type: String,
  enum: ["video", "like", "comment", "share", "follow", "social"], // ✅ added "social"
  required: true,
},

    platform: {
      type: String,
      enum: ["youtube", "tiktok", "facebook", "instagram", "twitter", "view", "click" ],
      required: true,
      lowercase: true,
      trim: true,
    },

    // For video tasks
    duration: { type: Number }, // seconds
    watches: { type: Number, default: 0 }, // current watch count
    maxWatches: { type: Number, default: 0 }, // ✅ limit views

    // For social tasks
    actions: [
  {
    type: { 
      type: String, 
      enum: ["like", "comment", "share", "follow", "subscribe"], 
      required: true 
    },
    points: { type: Number, required: true },
  },
],

    // Reward system
    points: { type: Number, required: true, min: 1 }, // reward per view/action
    fund: { type: Number, default: 0 }, // pool of points

    // Ownership
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    completedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // Meta
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    promoted: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Task", taskSchema);