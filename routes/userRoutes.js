import express from "express";
import {
  getProfile,
  updateProfile,
  followUser,
  unfollowUser,
  getReferrals,
  getSuggestedUsers,
  getUserById, // ✅ ADD THIS
} from "../controllers/userController.js";
import { getLeaderboard } from "../controllers/leaderboardController.js";
import protect from "../middleware/auth.js"; // ✅ fixed import

const router = express.Router();

// ================= PROFILE =================
router.get("/me", protect, getProfile);
router.put("/me", protect, updateProfile);

// ================= SOCIAL (FOLLOW/UNFOLLOW) =================
router.put("/follow/:id", protect, followUser);
router.put("/unfollow/:id", protect, unfollowUser);
router.get("/suggested", protect, getSuggestedUsers);

// ================= USER PROFILE BY ID =================
router.get("/:id", protect, getUserById); // ⬅ MUST be after /me & /suggested

// ================= REFERRALS =================
router.get("/referrals", protect, getReferrals);

// ================= LEADERBOARD =================
router.get("/leaderboard", getLeaderboard);

export default router;