// utils/dailyLoginHelper.js
import { updateUserPoints } from "../utils/pointsHelpers.js";
import User from "../models/User.js";

/**
 * Handles daily login reward for a user.
 * Tracks claimed days, streaks, and monthly/bonus points.
 * @param {Object} user - Mongoose user document
 * @param {Object|null} io - Optional Socket.IO instance for real-time updates
 * @returns {Object} Updated dailyLogin info + earned points today + bonus info
 */
export const dailyLoginRewardHelper = async (user, io = null) => {
  const today = new Date();
  const dayOfMonth = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // Initialize dailyLogin if missing
  if (!user.dailyLogin) {
    user.dailyLogin = {
      lastLoginDate: null,
      month: currentMonth,
      year: currentYear,
      monthlyTarget: Math.floor(Math.random() * (1000 - 50 + 1)) + 50,
      monthlyEarned: 0,
      streak: 0,
      claimedDays: [],
    };
  }

  // Reset month/year if needed
  if (user.dailyLogin.month !== currentMonth || user.dailyLogin.year !== currentYear) {
    user.dailyLogin.month = currentMonth;
    user.dailyLogin.year = currentYear;
    user.dailyLogin.monthlyTarget = Math.floor(Math.random() * (1000 - 50 + 1)) + 50;
    user.dailyLogin.monthlyEarned = 0;
    user.dailyLogin.streak = 0;
    user.dailyLogin.claimedDays = [];
    user.dailyLogin.lastLoginDate = null;
  }

  // Check if already claimed today
  const lastLogin = user.dailyLogin.lastLoginDate ? new Date(user.dailyLogin.lastLoginDate) : null;
  const isSameDay =
    lastLogin &&
    lastLogin.getFullYear() === today.getFullYear() &&
    lastLogin.getMonth() === today.getMonth() &&
    lastLogin.getDate() === dayOfMonth;

  if (isSameDay) {
    return { dailyLogin: user.dailyLogin, earnedToday: 0, bonus: null, message: "Already claimed today" };
  }

  // Calculate points for today
  const daysInMonth = new Date(today.getFullYear(), currentMonth + 1, 0).getDate();
  const dailyPoints = Math.floor(user.dailyLogin.monthlyTarget / daysInMonth);

  // Update streak
  let streak = user.dailyLogin.streak || 0;
  if (lastLogin) {
    const yesterday = new Date(today);
    yesterday.setDate(dayOfMonth - 1);

    const lastWasYesterday =
      lastLogin.getFullYear() === yesterday.getFullYear() &&
      lastLogin.getMonth() === yesterday.getMonth() &&
      lastLogin.getDate() === yesterday.getDate();

    streak = lastWasYesterday ? streak + 1 : 1; // reset if missed
  } else {
    streak = 1;
  }

  user.dailyLogin.streak = streak;

  // Add today's points
  await updateUserPoints(user._id, dailyPoints, "daily-login", null, "Daily login reward");
  user.dailyLogin.monthlyEarned += dailyPoints;
  user.dailyLogin.lastLoginDate = today;
  user.dailyLogin.claimedDays.push(dayOfMonth);

  // Check streak bonuses
  let bonus = null;
  if (streak === 7) {
    const bonusPoints = 500; // 7-day streak bonus
    await updateUserPoints(user._id, bonusPoints, "streak-bonus", null, "7-day streak bonus");
    bonus = { type: "7-day", points: bonusPoints };
  }
  if (streak === 30) {
    const bonusPoints = 3000; // 30-day mega bonus
    await updateUserPoints(user._id, bonusPoints, "streak-bonus", null, "30-day mega streak bonus");
    bonus = { type: "30-day", points: bonusPoints };
  }

  await user.save();

  // Emit real-time points update if Socket.IO provided
  if (io) {
    io.to(user._id.toString()).emit("pointsUpdate", { points: user.points });
  }

  return { dailyLogin: user.dailyLogin, earnedToday: dailyPoints, bonus, message: "Reward claimed" };
};