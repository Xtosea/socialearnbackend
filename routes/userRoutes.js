// routes/userRoutes.js
import express from "express";
import auth from "../middleware/auth.js";
import {
  getProfile,
  updateProfile,
  followUser,
  unfollowUser,
  getReferrals,
} from "../controllers/userController.js";
import { getLeaderboard } from "../controllers/leaderboardController.js"; // optional, or just keep inline

const router = express.Router();

// ================= PROFILE =================
router.get("/me", auth, getProfile);
router.put("/me", auth, updateProfile);

// ================= SOCIAL (FOLLOW/UNFOLLOW) =================
router.post("/follow/:id", auth, followUser);
router.post("/unfollow/:id", auth, unfollowUser);

// ================= REFERRALS =================
router.get("/referrals", auth, getReferrals);

// ================= LEADERBOARD =================
router.get("/leaderboard", getLeaderboard);

export default router;