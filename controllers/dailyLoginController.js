import User from "../models/User.js";
import { updateUserPoints } from "../utils/pointsHelpers.js";

// helper to check same day
const isSameDay = (d1, d2) =>
  d1 &&
  d2 &&
  d1.getFullYear() === d2.getFullYear() &&
  d1.getMonth() === d2.getMonth() &&
  d1.getDate() === d2.getDate();

export const dailyLoginReward = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    // Initialize dailyLogin if missing
    if (!user.dailyLogin) {
      user.dailyLogin = {
        lastLoginDate: null,
        monthlyTarget: 0,
        monthlyEarned: 0,
        month: new Date().getMonth(),
      };
    }

    const today = new Date();
    const currentMonth = today.getMonth();

    // Reset monthly progress if month changed
    if (user.dailyLogin.month !== currentMonth) {
      user.dailyLogin.month = currentMonth;
      user.dailyLogin.monthlyEarned = 0;
      user.dailyLogin.monthlyTarget =
        Math.floor(Math.random() * (1000 - 50 + 1)) + 50; // random monthly target
      user.dailyLogin.lastLoginDate = null;
    }

    // Already claimed today
    if (user.dailyLogin.lastLoginDate && isSameDay(user.dailyLogin.lastLoginDate, today)) {
      return res.status(400).json({
        message: "Daily login reward already claimed",
      });
    }

    // Calculate daily points
    const daysInMonth = new Date(today.getFullYear(), currentMonth + 1, 0).getDate();
    const dailyPoints = Math.floor(user.dailyLogin.monthlyTarget / daysInMonth);

    // Check monthly cap
    if (user.dailyLogin.monthlyEarned >= user.dailyLogin.monthlyTarget) {
      return res.json({
        message: "Monthly login reward completed",
        monthlyTarget: user.dailyLogin.monthlyTarget,
      });
    }

    // ✅ Apply points via helper (logs history)
    await updateUserPoints({
      user,
      amount: dailyPoints,
      taskType: "daily-login",
      taskId: null,
      description: "Daily login reward",
      req, // emit socket event if available
    });

    // Update daily login info
    user.dailyLogin.monthlyEarned += dailyPoints;
    user.dailyLogin.lastLoginDate = today;
    await user.save();

    res.json({
      message: "Daily login reward claimed",
      earnedToday: dailyPoints,
      monthlyEarned: user.dailyLogin.monthlyEarned,
      monthlyTarget: user.dailyLogin.monthlyTarget,
    });
  } catch (err) {
    console.error("Daily login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};