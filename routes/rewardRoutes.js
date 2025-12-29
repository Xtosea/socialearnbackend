// routes/rewardRoutes.js
import express from "express";
import { dailyLoginReward } from "../controllers/dailyLoginController.js";
import protect from "../middleware/auth.js";

const router = express.Router();

router.post("/daily-login", protect, dailyLoginReward);

export default router;