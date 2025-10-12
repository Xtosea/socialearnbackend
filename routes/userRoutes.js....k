// routes/userRoutes.js
import express from "express";
import User from "../models/User.js";
import auth from "../middleware/auth.js"; // ✅ JWT middleware

const router = express.Router();

// ================== GET CURRENT USER ==================
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (err) {
    console.error("Error fetching current user:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ================== LEADERBOARD ==================
router.get("/leaderboard", async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 3;
    const leaders = await User.find()
      .sort({ points: -1 })
      .limit(limit)
      .select("username points");
    res.json({ leaders });
  } catch (err) {
    console.error("Error fetching leaderboard:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;