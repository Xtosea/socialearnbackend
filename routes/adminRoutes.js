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
  deleteUser,
  deleteVideoTask
} from "../controllers/adminController.js";

const router = express.Router();

// Users
router.get("/users", auth, adminMiddleware, getAllUsers);
router.delete("/users/:userId", auth, adminMiddleware, deleteUser);

// Wallet
router.get("/wallet", auth, adminMiddleware, getAdminWallet);
router.post("/wallet/add", auth, adminMiddleware, addToAdminWallet);
router.post("/wallet/reset", auth, adminMiddleware, resetAdminWallet);

// User points
router.post("/points/add", auth, adminMiddleware, addPointsToUser);
router.post("/points/deduct", auth, adminMiddleware, deductPointsFromUser);

// Leaderboard
router.post("/points/reward-leaderboard", auth, adminMiddleware, rewardLeaderboard);

// Video Tasks
router.delete("/tasks/:taskId", auth, adminMiddleware, deleteVideoTask);

export default router;