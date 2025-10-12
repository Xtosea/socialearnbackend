import express from "express";
import auth from "../middleware/auth.js";
import { adminMiddleware } from "../middleware/admin.js";
import {
  resetAdminPoints,
  getAdminWallet,
  addPointsToUser,
  deductPointsFromUser,
  rewardTopUsers,
  getAllUsers,
} from "../controllers/adminPointsController.js";

const router = express.Router();

// Users
router.get("/users", auth, adminMiddleware, getAllUsers);

// Wallet
router.get("/wallet", auth, adminMiddleware, getAdminWallet);
router.post("/wallet/reset", auth, adminMiddleware, resetAdminPoints);

// Points
router.post("/points/add", auth, adminMiddleware, addPointsToUser);
router.post("/points/deduct", auth, adminMiddleware, deductPointsFromUser);

// Leaderboard Rewards
router.post("/points/reward-leaderboard", auth, adminMiddleware, rewardTopUsers);

export default router;