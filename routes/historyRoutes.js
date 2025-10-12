// routes/historyRoutes.js
import express from "express";
import auth from "../middleware/auth.js";
import HistoryLog from "../models/HistoryLog.js";
import Task from "../models/Task.js";

const router = express.Router();

// ✅ Get user history (video + social)
router.get("/", auth, async (req, res) => {
  try {
    // Get all history for logged-in user
    const history = await HistoryLog.find({ user: req.user.id }).sort({ createdAt: -1 });

    // Enrich with task details (url, duration, createdBy, completedBy, etc.)
    const enriched = await Promise.all(
      history.map(async (log) => {
        let taskDetails = null;

        if (log.taskId) {
          const task = await Task.findById(log.taskId)
            .populate("createdBy", "username email")   // get promoter info
            .populate("completedBy", "username email"); // get all who completed

          if (task) {
            taskDetails = {
              url: task.url,
              duration: task.duration,
              points: task.points,
              fund: task.fund,
              type: task.type,
              platform: task.platform,
              createdBy: task.createdBy?.username || task.createdBy?._id,
              completedBy: task.completedBy?.map(u => u.username) || [],
              totalWatches: task.watches,
            };
          }
        }

        return {
          _id: log._id,
          taskType: log.taskType,
          amount: log.amount,
          createdAt: log.createdAt,
          ...taskDetails, // spread task info into history object
        };
      })
    );

    res.json({ history: enriched });
  } catch (err) {
    console.error("History fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;