import express from "express";
import Task from "../../models/Task.js";
import User from "../models/User.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// ===========================
// Submit a watch video task
// ===========================
router.post("/watch/submit", auth, async (req, res) => {
  // ✅ Debug: log incoming request body
  console.log("Submit watch task body:", req.body);

  try {
    const { userId, url, platform, duration, points, maxWatches, fund } = req.body;

    // Validate required fields
    if (!userId || !url || !platform || !duration || !points || !maxWatches || !fund) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Check if user has enough points
    if (user.points < fund) {
      return res.status(400).json({ message: "Not enough points" });
    }

    // Create the task
    const task = await Task.create({
      url,
      platform,
      type: "video",
      duration,
      points,
      maxWatches,
      fund,
      createdBy: userId,
    });

    // Deduct points from user
    user.points -= fund;
    await user.save();

    res.status(201).json({
      message: "Video task submitted successfully",
      task,
      newPoints: user.points,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;