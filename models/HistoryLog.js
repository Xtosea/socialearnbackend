import mongoose from "mongoose";
const { Schema } = mongoose;

const HistorySchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },

    taskType: {
      type: String,
      enum: [
        // Core earnings
        "video-task-fund",
        "video-view",
        "action",
        "daily-login",
        "daily-action",
        "referral-bonus",
         "social-task",
        "task-promotion",

        // Admin actions
        "admin_add",
        "admin_deduct",
        "bulk-transfer",

        // Transfers
        "transfer_in",
        "transfer_out",

        // Marketplace / promotions
        "promotion",
        "redeem"
      ],
      required: true,
    },

    taskId: { type: Schema.Types.ObjectId, ref: "Task" },
    amount: { type: Number, required: true },
    description: { type: String, default: "" },
    metadata: { type: Object },
  },
  { timestamps: true }
);

export default mongoose.model("History", HistorySchema);