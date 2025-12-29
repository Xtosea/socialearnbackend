import User from "../models/User.js";

// helper
const isSameDay = (d1, d2) =>
  d1 &&
  d2 &&
  d1.getFullYear() === d2.getFullYear() &&
  d1.getMonth() === d2.getMonth() &&
  d1.getDate() === d2.getDate();

export const dailyLoginReward = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    const today = new Date();
    const currentMonth = today.getMonth();

    // 🔄 MONTH RESET
    if (user.dailyLogin.month !== currentMonth) {
      user.dailyLogin.month = currentMonth;
      user.dailyLogin.monthlyEarned = 0;
      user.dailyLogin.monthlyTarget =
        Math.floor(Math.random() * (1000 - 50 + 1)) + 50;
      user.dailyLogin.lastLoginDate = null;
    }

    // ❌ ALREADY LOGGED IN TODAY
    if (isSameDay(user.dailyLogin.lastLoginDate, today)) {
      return res.status(400).json({
        message: "Daily login reward already claimed",
      });
    }

    // 📆 DAYS IN CURRENT MONTH
    const daysInMonth = new Date(
      today.getFullYear(),
      currentMonth + 1,
      0
    ).getDate();

    // 🎯 POINTS PER LOGIN DAY
    const dailyPoints = Math.floor(
      user.dailyLogin.monthlyTarget / daysInMonth
    );

    // 🛑 CAP CHECK
    if (user.dailyLogin.monthlyEarned >= user.dailyLogin.monthlyTarget) {
      return res.json({
        message: "Monthly login reward completed",
        monthlyTarget: user.dailyLogin.monthlyTarget,
      });
    }

    // ✅ APPLY POINTS
    user.points += dailyPoints;
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