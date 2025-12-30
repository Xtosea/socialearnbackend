import express from "express";
import { claimDailyLogin } from "../controllers/dailyLoginController.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// Claim daily login reward (calendar click)
router.post("/claim", auth, claimDailyLogin);

export default router;