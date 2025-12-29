import User from "../models/User.js";
import { updateUserPoints } from "../utils/pointsHelpers.js";

const isSameDay = (d1, d2) =>
  d1 &&
  d2 &&
  d1.getFullYear() === d2.getFullYear() &&
  d1.getMonth() === d2.getMonth() &&
  d1.getDate() === d2.getDate();

export const dailyLoginReward = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User no found" });

    const today = new Date();
    const currentMonth = today.getMonth();

    if (!user.dailyLogin) {
      user.dailyLogin = {
        lastLoginDate: null,
        monthlyTarget: 0,
        monthlyEarned: 0,
        month: currentMonth,
      };
    }

    if (user.dailyLogin.month !== currentMonth) {
      user.dailyLogin.month = currentMonth;
      user.dailyLogin.monthlyEarned = 0;
      user.dailyLogin.monthlyTarget =
        Math.floor(Math.random() * (1000 - 50 + 1)) + 50;
      user.dailyLogin.lastLoginDate = null;
    }

    if (
      user.dailyLogin.lastLoginDate &&
      isSameDay(user.dailyLogin.lastLoginDate, today)
    ) {
      return res.json({
        message: "Daily login reward already claimed",
        earnedToday: 0,
        newPoints: user.points,
        dailyLogin: user.dailyLogin,
      });
    }

    const daysInMonth = new Date(
      today.getFullYear(),
      currentMonth + 1,
      0
    ).getDate();

    const dailyPoints = Math.floor(
      user.dailyLogin.monthlyTarget / daysInMonth
    );

    await updateUserPoints({
      user,
      amount: dailyPoints,
      taskType: "daily-login",
      description: "Daily login reward",
      req,
    });

    user.dailyLogin.monthlyEarned += dailyPoints;
    user.dailyLogin.lastLoginDate = today;
    await user.save();

    res.json({
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