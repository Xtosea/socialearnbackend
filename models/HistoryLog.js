import mongoose from "mongoose";
const { Schema } = mongoose;

const HistorySchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },

    taskType: {
      type: String,
      enum: [
        "video-view",   // user watched video
        "action",       // like, share, comment
        "transfer",     // user ↔ user or admin → user
        "redeem",       // user redeem points
        "admin",        // admin add/deduct
        "bulk-transfer",// admin bulk
        "promotion"     // task promoted
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