// scripts/fixUrls.js
import mongoose from "mongoose";
import Task from "../models/Task.js";
import { normalizeYouTubeUrl } from "../utils/normalizeYoutubeUrl.js";

const MONGO_URI = process.env.MONGO_URI;

async function fixUrls() {
  await mongoose.connect(MONGO_URI);

  const tasks = await Task.find({ type: "video" });
  for (let task of tasks) {
    const clean = normalizeYouTubeUrl(task.url);
    if (clean !== task.url) {
      task.url = clean;
      await task.save();
      console.log(`✅ Fixed: ${task._id}`);
    }
  }

  console.log("All done!");
  mongoose.disconnect();
}

fixUrls();