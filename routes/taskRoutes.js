// routes/taskRoutes.js
import express from "express";
import auth from "../middleware/auth.js";
import {
  addVideoTask,
  getVideoTasks,
  startWatch,
  completeWatch,
  addSocialTask,
  getSocialTasks,
  completeSocialAction,
  getPromotedTasksByPlatform,
  promoteTask,
} from "../controllers/taskController.js";
import PromotionSettings from "../models/PromotionSettings.js";

const router = express.Router();

// ---------------------------
// Video routes
// ---------------------------
router.post("/video", auth, addVideoTask);
router.get("/video", auth, getVideoTasks);
router.post("/watch/:taskId/start", auth, startWatch);
router.post("/watch/:taskId/complete", auth, completeWatch);

// ---------------------------
// Social routes
// ---------------------------
router.post("/social", auth, addSocialTask);
router.get("/social", auth, getSocialTasks);
router.post("/social/:taskId/complete", auth, completeSocialAction);

// ---------------------------
// Promotion routes
// ---------------------------
// Unified: /tasks/promoted/:type/:platform
router.get("/promoted/:type/:platform", auth, getPromotedTasksByPlatform);
router.post("/promote", auth, promoteTask);

// Promotion costs (from DB or default)
router.get("/promoted-costs", auth, async (req, res) => {
  try {
    let settings = await PromotionSettings.findOne();
    if (!settings) {
      settings = await PromotionSettings.create({
        globalCost: 50,
        platformCosts: {},
        actionCosts: {},
      });
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;