import express from "express";
import User from "../models/User.js";
import Post from "../models/Post.js";

const router = express.Router();

// Reward points
router.post("/reward", async (req, res) => {
  const { userId, postId, action } = req.body;

  let reward = 0;

  if (action === "view") reward = 5;
  if (action === "like") reward = 10;
  if (action === "share") reward = 20;

  await User.findByIdAndUpdate(userId, {
    $inc: { points: reward },
  });

  await Post.findByIdAndUpdate(postId, {
    $inc: { points: reward },
  });

  res.json({ reward });
});

export default router;