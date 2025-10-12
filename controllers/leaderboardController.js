// controllers/leaderboardController.js
import User from "../models/User.js";

export const getLeaderboard = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 3;
    const leaders = await User.find()
      .sort({ points: -1 })
      .limit(limit)
      .select("username points");
    res.json({ leaders });
  } catch (err) {
    console.error("Error fetching leaderboard:", err);
    res.status(500).json({ message: "Server error" });
  }
};