import express from "express";
import {
  registerUser,
  loginUser,
  getCurrentUser,
 } from "../controllers/authController.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", auth, getCurrentUser);
router.put("/update", auth, updateProfile);

export default router;