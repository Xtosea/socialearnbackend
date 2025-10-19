import express from "express";
import {
  getProfile,
  updateProfile,
  followUser,
  unfollowUser,
  getReferrals,
} from "../controllers/userController.js";
import { getLeaderboard } from "../controllers/leaderboardController.js";
import { protect } from "../middleware/authMiddleware.js"; // unified middleware

const router = express.Router();

// ================= PROFILE =================
router.get("/me", protect, getProfile);
router.put("/me", protect, updateProfile);

// ================= SOCIAL (FOLLOW/UNFOLLOW) =================
router.put("/follow/:id", protect, followUser);
router.put("/unfollow/:id", protect, unfollowUser);

// ================= REFERRALS =================
router.get("/referrals", protect, getReferrals);

// ================= LEADERBOARD =================
router.get("/leaderboard", getLeaderboard);

export default router;