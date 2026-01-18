import express from "express";
import Post from "../models/Post.js";

const router = express.Router();

// Detect platform from URL
const detectPlatform = (url) => {
  if (url.includes("youtube")) return "youtube";
  if (url.includes("tiktok")) return "tiktok";
  if (url.includes("instagram")) return "instagram";
  if (url.includes("facebook")) return "facebook";
  return null;
};

// Create post
router.post("/", async (req, res) => {
  try {
    const { url } = req.body;
    const platform = detectPlatform(url);

    if (!platform) {
      return res.status(400).json({ message: "Unsupported platform" });
    }

    const post = await Post.create({ url, platform });
    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get feed
router.get("/", async (req, res) => {
  const posts = await Post.find().sort({ createdAt: -1 });
  res.json(posts);
});

export default router;