// utils/dailyLoginHelper.js
import User from "../models/User.js";
import { updateUserPoints } from "./pointsHelpers.js";

// Helper to check same day
const isSameDay = (d1, d2) =>
  d1 &&
  d2 &&
  d1.getFullYear() === d2.getFullYear() &&
  d1.getMonth() === d2.getMonth() &&
  d1.getDate() === d2.getDate();

/**
 * Handles daily login reward for a user
 * @param {Object} user - Mongoose User document
 * @param {Object} req - Express request (used for Socket.IO)
 * @returns {Object} daily reward info
 */
export const dailyLoginRewardHelper = async (user, req) => {
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

  // Reset monthly progress if new month
  if (user.dailyLogin.month !== currentMonth) {
    user.dailyLogin.month = currentMonth;
    user.dailyLogin.monthlyEarned = 0;
    user.dailyLogin.monthlyTarget =
      Math.floor(Math.random() * (1000 - 50 + 1)) + 50; // 50-1000 points/month
    user.dailyLogin.lastLoginDate = null;
  }

  // Already claimed today
  if (user.dailyLogin.lastLoginDate && isSameDay(user.dailyLogin.lastLoginDate, today)) {
    return {
      message: "Daily login reward already claimed",
      earnedToday: 0,
      monthlyEarned: user.dailyLogin.monthlyEarned,
      monthlyTarget: user.dailyLogin.monthlyTarget,
    };
  }

  // Calculate daily points
  const daysInMonth = new Date(today.getFullYear(), currentMonth + 1, 0).getDate();
  const dailyPoints = Math.floor(user.dailyLogin.monthlyTarget / daysInMonth);

  // Check monthly cap
  if (user.dailyLogin.monthlyEarned >= user.dailyLogin.monthlyTarget) {
    return {
      message: "Monthly login reward completed",
      earnedToday: 0,
      monthlyEarned: user.dailyLogin.monthlyEarned,
      monthlyTarget: user.dailyLogin.monthlyTarget,
    };
  }

  // Apply points using helper
  await updateUserPoints({
    user,
    amount: dailyPoints,
    taskType: "daily-login",
    taskId: null,
    description: "Daily login reward",
    req, // emit socket event if needed
  });

  // Update daily login info
  user.dailyLogin.monthlyEarned += dailyPoints;
  user.dailyLogin.lastLoginDate = today;
  await user.save();

  return {
    message: "Daily login reward claimed",
    earnedToday: dailyPoints,
    monthlyEarned: user.dailyLogin.monthlyEarned,
    monthlyTarget: user.dailyLogin.monthlyTarget,
  };
};