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
import protect from "../middleware/auth.js"; // JWT auth

const router = express.Router();



// ================= SOCIAL (FOLLOW/UNFOLLOW) =================
router.put("/follow/:id", protect, followUser);
router.put("/unfollow/:id", protect, unfollowUser);

// ================= REFERRALS =================
router.get("/referrals", protect, getReferrals);

// ================= LEADERBOARD =================
router.get("/leaderboard", getLeaderboard);

export default router;