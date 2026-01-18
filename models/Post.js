import mongoose from "mongoose";

const postSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
  },
  platform: {
    type: String,
    enum: ["youtube", "tiktok", "instagram", "facebook"],
    required: true,
  },
  points: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Post", postSchema);