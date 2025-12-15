// models/Task.js
import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },

    type: {
      type: String,
      enum: ["video", "like", "comment", "share", "follow", "social"],
      required: true,
    },

    // ✅ Title OPTIONAL (auto-filled if missing)
    title: {
      type: String,
      trim: true,
      default: function () {
        return `${this.platform || "Social"} task`;
      },
    },

    platform: {
      type: String,
      enum: [
        "youtube",
        "tiktok",
        "facebook",
        "instagram",
        "twitter",
        "view",
        "click",
      ],
      required: true,
      lowercase: true,
      trim: true,
    },

    /* =========================
       VIDEO TASKS
    ========================== */
    duration: { type: Number },
    watches: { type: Number, default: 0 },
    maxWatches: { type: Number, default: 0 },

    /* =========================
       SOCIAL TASKS
    ========================== */
    actions: [
      {
        type: {
          type: String,
          enum: ["like", "comment", "share", "follow", "subscribe"],
          required: true,
        },
        points: { type: Number, required: true },
      },
    ],

    /* =========================
       REWARD SYSTEM
    ========================== */
    points: { type: Number, required: true, min: 1 },
    fund: { type: Number, default: 0 },

    // ⚠️ OPTIONAL — keep only if you REALLY need it
    rewardPoints: { type: Number },

    /* =========================
       TRACKING
    ========================== */
    workingOn: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        startedAt: { type: Date, default: Date.now },
      },
    ],

    completedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    /* =========================
       OWNERSHIP
    ========================== */
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    /* =========================
       META
    ========================== */
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    promoted: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Task", taskSchema);