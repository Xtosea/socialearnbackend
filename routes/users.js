// routes/user.js
import express from 'express';
import User from '../models/User.js';

const router = express.Router();

// ================= LEADERBOARD =================
router.get('/leaderboard', async (req, res) => {
  const limit = Number(req.query.limit) || 10; // default top 10 users

  try {
    const leaders = await User.find()
      .sort({ points: -1 })
      .limit(limit)
      .select('username points followers referrals');

    const formattedLeaders = leaders.map(user => ({
      username: user.username,
      points: user.points,
      followerCount: user.followers.length,
      referralCount: user.referrals.length,
    }));

    res.json({ leaders: formattedLeaders });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;