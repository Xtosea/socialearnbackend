import express from "express";
import auth from "../middleware/auth.js";
import { adminMiddleware } from "../middleware/admin.js";
import {
  getAllUsers,
  getAdminWallet,
  addToAdminWallet,
  resetAdminWallet,
  addPointsToUser,
  deductPointsFromUser,
  rewardLeaderboard,
} from "../controllers/adminController.js";

const router = express.Router();

// ================= USERS =================
router.get("/users", auth, adminMiddleware, getAllUsers);

// ================= WALLET =================
router.get("/wallet", auth, adminMiddleware, getAdminWallet);
router.post("/wallet/add", auth, adminMiddleware, addToAdminWallet);
router.post("/wallet/reset", auth, adminMiddleware, resetAdminWallet);

// ================= USER POINTS =================
router.post("/points/add", auth, adminMiddleware, addPointsToUser);
router.post("/points/deduct", auth, adminMiddleware, deductPointsFromUser);

// ================= LEADERBOARD =================
router.post("/points/reward-leaderboard", auth, adminMiddleware, rewardLeaderboard);

export default router;