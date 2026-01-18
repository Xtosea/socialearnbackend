// routes/tasks/watch.js
import express from "express";
import Task from "../../models/Task.js";
import User from "../../models/User.js";

const router = express.Router();

// Submit a new watch task
router.post("/submit", async (req, res) => {
  try {
    const { url, platform, duration, points, maxWatches, fund } = req.body;
    const { userId } = req.body; // frontend should send userId

    // Create task
    const task = await Task.create({
      url,
      type: "video",
      platform,
      duration,
      points,
      maxWatches,
      fund,
      createdBy: userId,
    });

    // Deduct points from user
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    user.points = Math.max(0, user.points - fund);
    await user.save();

    res.status(201).json({ task, newPoints: user.points });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;