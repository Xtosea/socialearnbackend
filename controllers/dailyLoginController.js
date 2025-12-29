// controllers/dailyLoginController.js
import User from "../models/User.js";
import { updateUserPoints } from "../utils/pointsHelpers.js";

// Helper to check if two dates are the same day
const isSameDay = (d1, d2) =>
  d1 &&
  d2 &&
  d1.getFullYear() === d2.getFullYear() &&
  d1.getMonth() === d2.getMonth() &&
  d1.getDate() === d2.getDate();

export const dailyLoginReward = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const today = new Date();
    const currentMonth = today.getMonth();

    // Initialize dailyLogin object if missing
    if (!user.dailyLogin) {
      user.dailyLogin = {
        lastLoginDate: null,
        monthlyTarget: 0,
        monthlyEarned: 0,
        month: currentMonth,
      };
    }

    // Reset monthly stats if new month
    if (user.dailyLogin.month !== currentMonth) {
      user.dailyLogin.month = currentMonth;
      user.dailyLogin.monthlyEarned = 0;
      user.dailyLogin.monthlyTarget =
        Math.floor(Math.random() * (1000 - 50 + 1)) + 50;
      user.dailyLogin.lastLoginDate = null;
    }

    // Already claimed today
    if (
      user.dailyLogin.lastLoginDate &&
      isSameDay(user.dailyLogin.lastLoginDate, today)
    ) {
      return res.status(200).json({
        message: "Daily login reward already claimed",
        earnedToday: 0,
        newPoints: user.points,
        dailyLogin: user.dailyLogin,
      });
    }

    const daysInMonth = new Date(today.getFullYear(), currentMonth + 1, 0).getDate();
    const dailyPoints = Math.floor(user.dailyLogin.monthlyTarget / daysInMonth);

    // Check monthly cap
    if (user.dailyLogin.monthlyEarned >= user.dailyLogin.monthlyTarget) {
      return res.status(200).json({
        message: "Monthly login reward completed",
        earnedToday: 0,
        newPoints: user.points,
        dailyLogin: user.dailyLogin,
      });
    }

    // Add points
    await updateUserPoints({
      user,
      amount: dailyPoints,
      taskType: "daily-login",
      description: "Daily login reward",
      req,
    });

    // Update dailyLogin info
    user.dailyLogin.lastLoginDate = today;
    user.dailyLogin.monthlyEarned += dailyPoints;

    await user.save();

    res.status(200).json({
      message: "Daily login reward claimed",
      earnedToday: dailyPoints,
      newPoints: user.points,
      dailyLogin: user.dailyLogin,
    });
  } catch (err) {
    console.error("Daily login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};