import express from "express";
import User from "../models/User.js";
import {
  getProfile,
  updateProfile,
  followUser,
  unfollowUser,
  getReferrals,
} from "../controllers/userController.js";
import { getLeaderboard } from "../controllers/leaderboardController.js";
import { protect } from "../middleware/authMiddleware.js"; // JWT auth

const router = express.Router();

// ================= PROFILE =================
router.get("/me", protect, getProfile);
router.put("/me", protect, updateProfile);

// ================= SUGGESTED USERS =================
router.get("/suggested", protect, async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const users = await User.find({ _id: { $ne: currentUserId } })
      .select("-password") // hide passwords
      .limit(10); // adjust as needed
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ================= SOCIAL (FOLLOW/UNFOLLOW) =================
router.put("/follow/:id", protect, followUser);
router.put("/unfollow/:id", protect, unfollowUser);

// ================= REFERRALS =================
router.get("/referrals", protect, getReferrals);

// ================= LEADERBOARD =================
router.get("/leaderboard", getLeaderboard);

export default router;