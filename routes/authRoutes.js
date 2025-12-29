import express from "express";
import {
  registerUser,
  loginUser,
  getCurrentUser,
  updateProfile,
  claimDailyLogin,
} from "../controllers/authController.js";
import protect from "../middleware/auth.js";

const router = express.Router();

// ================= AUTH =================
router.post("/register", registerUser);
router.post("/login", loginUser);

// ================= USER =================
router.get("/me", protect, getCurrentUser);        // get current user
router.put("/me", protect, updateProfile);        // update profile

// ================= DAILY LOGIN REWARD =================
router.post("/daily-login", protect, claimDailyLogin); // claim daily points

export default router;