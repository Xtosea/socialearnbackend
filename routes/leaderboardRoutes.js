// routes/leaderboardRoutes.js
import express from 'express';
import User from '../models/User.js';

const router = express.Router();

// ================= LEADERBOARD =================
// GET /api/leaderboard?limit=5
router.get('/leaderboard', async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 3; // default top 3
    const leaders = await User.find()
      .sort({ points: -1 }) // descending points
      .limit(limit)
      .select('username points'); // only return username and points

    res.json({ leaders });
  } catch (err) {
    console.error("Leaderboard error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;// routes/leaderboardRoutes.js
import express from 'express';
import User from '../models/User.js';
const router = express.Router();

router.get('/leaderboard', async (req, res) => {
  const limit = Number(req.query.limit) || 10;

  try {
    const leaders = await User.find()
      .sort({ points: -1 })
      .limit(limit)
      .select('username points followers referrals');

    const formatted = leaders.map(user => ({
      username: user.username,
      points: user.points,
      followerCount: user.followers.length,
      referralCount: user.referrals.length,
    }));

    res.json({ leaders: formatted });
  } catch (err) {
    console.error("Leaderboard error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;