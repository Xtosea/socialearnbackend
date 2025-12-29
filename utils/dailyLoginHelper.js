// utils/dailyLoginHelper.js
import { updateUserPoints } from "./pointsHelpers.js";

const isSameDay = (d1, d2) =>
  d1 &&
  d2 &&
  d1.getFullYear() === d2.getFullYear() &&
  d1.getMonth() === d2.getMonth() &&
  d1.getDate() === d2.getDate();

/**
 * Handles daily login rewards for a user.
 * @param {Object} user - Mongoose User document
 * @param {Object} req - Optional Express request (for Socket.IO updates)
 * @returns {Object} - { earnedToday, newPoints, dailyLogin }
 */
export const dailyLoginRewardHelper = async (user, req = null) => {
  if (!user) throw new Error("User is required");

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
    user.dailyLogin.monthlyTarget = Math.floor(Math.random() * (1000 - 50 + 1)) + 50;
    user.dailyLogin.lastLoginDate = null;
  }

  // Already claimed today
  if (user.dailyLogin.lastLoginDate && isSameDay(user.dailyLogin.lastLoginDate, today)) {
    return {
      earnedToday: 0,
      newPoints: user.points,
      dailyLogin: user.dailyLogin,
    };
  }

  // Compute daily points
  const daysInMonth = new Date(today.getFullYear(), currentMonth + 1, 0).getDate();
  const dailyPoints = Math.floor(user.dailyLogin.monthlyTarget / daysInMonth);

  // Check monthly cap
  if (user.dailyLogin.monthlyEarned >= user.dailyLogin.monthlyTarget) {
    return {
      earnedToday: 0,
      newPoints: user.points,
      dailyLogin: user.dailyLogin,
    };
  }

  // Update points
  await updateUserPoints({
    user,
    amount: dailyPoints,
    taskType: "daily-login",
    description: "Daily login reward",
    req,
  });

  // Update dailyLogin stats
  user.dailyLogin.monthlyEarned += dailyPoints;
  user.dailyLogin.lastLoginDate = today;

  await user.save();

  return {
    earnedToday: dailyPoints,
    newPoints: user.points,
    dailyLogin: user.dailyLogin,
  };
};