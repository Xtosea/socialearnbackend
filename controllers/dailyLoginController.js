// utils/dailyLoginHelper.js
import { updateUserPoints } from "./pointsHelpers.js";

/**
 * Handles daily login reward for a user.
 * Can be used automatically on login or manually via endpoint.
 * @param {Object} user - Mongoose user document
 * @param {Object|null} io - Optional Socket.IO instance for real-time updates
 * @returns {Object} Updated dailyLogin info + earned points today
 */
export const dailyLoginRewardHelper = async (user, io = null) => {
  const today = new Date();
  const currentMonth = today.getMonth();

  if (!user.dailyLogin) {
    user.dailyLogin = {
      lastLoginDate: null,
      monthlyTarget: Math.floor(Math.random() * (1000 - 50 + 1)) + 50,
      monthlyEarned: 0,
      month: currentMonth,
    };
  }

  // Reset month if needed
  if (user.dailyLogin.month !== currentMonth) {
    user.dailyLogin.month = currentMonth;
    user.dailyLogin.monthlyEarned = 0;
    user.dailyLogin.monthlyTarget = Math.floor(Math.random() * (1000 - 50 + 1)) + 50;
    user.dailyLogin.lastLoginDate = null;
  }

  // Check if already claimed today
  const lastLogin = user.dailyLogin.lastLoginDate ? new Date(user.dailyLogin.lastLoginDate) : null;
  const isSameDay =
    lastLogin &&
    lastLogin.getFullYear() === today.getFullYear() &&
    lastLogin.getMonth() === today.getMonth() &&
    lastLogin.getDate() === today.getDate();

  if (isSameDay) {
    return { dailyLogin: user.dailyLogin, earnedToday: 0, message: "Already claimed today" };
  }

  // Calculate points for today
  const daysInMonth = new Date(today.getFullYear(), currentMonth + 1, 0).getDate();
  const dailyPoints = Math.floor(user.dailyLogin.monthlyTarget / daysInMonth);

  // Update points using helper
  await updateUserPoints(user._id, dailyPoints, "daily-login", null, "Daily login reward");

  user.dailyLogin.lastLoginDate = today;
  user.dailyLogin.monthlyEarned += dailyPoints;

  await user.save();

  // Emit real-time points update if Socket.IO provided
  if (io) {
    io.to(user._id.toString()).emit("pointsUpdate", { points: user.points });
  }

  return { dailyLogin: user.dailyLogin, earnedToday: dailyPoints, message: "Reward claimed" };
};