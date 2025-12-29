import express from "express";
import { dailyLoginReward } from "../controllers/dailyLoginController.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.post("/daily-login", auth, dailyLoginReward);

export default router;