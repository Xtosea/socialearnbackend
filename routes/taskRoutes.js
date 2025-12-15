import express from "express";
import auth from "../middleware/auth.js";
import {
  // Video
  addVideoTask,
  getVideoTasks,
  startWatch,
  completeWatch,

  // Social
  addSocialTask,
  getSocialTasks,
  startSocialTask,
  completeSocialAction,
  getPlatformActionTasks,

  // Promotion
  getPromotedTasksByPlatform,
  promoteTask,
} from "../controllers/taskController.js";

import PromotionSettings from "../models/PromotionSettings.js";

const router = express.Router();

/* ======================================================
   VIDEO TASK ROUTES
====================================================== */
router.post("/video", auth, addVideoTask);
router.get("/video", auth, getVideoTasks);
router.post("/watch/:taskId/start", auth, startWatch);
router.post("/watch/:taskId/complete", auth, completeWatch);

/* ======================================================
   SOCIAL TASK ROUTES
====================================================== */
router.post("/social", auth, addSocialTask);
router.get("/social", auth, getSocialTasks);
router.get("/action/:platform", auth, getPlatformActionTasks);
router.post("/social/:taskId/start", auth, startSocialTask);
router.post("/social/:taskId/complete", auth, completeSocialAction);

/* ======================================================
   PROMOTION ROUTES
====================================================== */
// Get promoted tasks (video or social)
// /tasks/promoted/:type/:platform
router.get("/promoted/:type/:platform", auth, getPromotedTasksByPlatform);

// Promote a task
router.post("/promote", auth, promoteTask);

// Promotion costs (stored in DB)
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