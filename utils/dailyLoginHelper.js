// utils/dailyLoginHelper.js
import { updateUserPoints } from "./pointsHelpers.js";

/**
 * Handles daily login rewards:
 * - Awards points if user hasn't logged in today
 * - Resets monthly earned points if a new month starts
 * - Emits Socket.IO points updates if io is passed
 * @param {Object} user - Mongoose User document
 * @param {Object} [io] - Optional Socket.IO instance
 * @returns {Object} dailyLogin info
 */
export const dailyLoginRewardHelper = async (user, io = null) => {
  if (!user.dailyLogin) {
    user.dailyLogin = {
      lastLoginDate: null,
      monthlyTarget: 0,
      monthlyEarned: 0,
      month: new Date().getMonth(),
    };
  }

  const lastLogin = user.dailyLogin.lastLoginDate ? new Date(user.dailyLogin.lastLoginDate) : null;
  const today = new Date();

  // Compare only the date portion
  const isSameDay =
    lastLogin &&
    lastLogin.getFullYear() === today.getFullYear() &&
    lastLogin.getMonth() === today.getMonth() &&
    lastLogin.getDate() === today.getDate();

  if (!isSameDay) {
    const pointsToAdd = 10; // Daily points

    // Update user's points and history
    await updateUserPoints(user._id, pointsToAdd, "Daily login reward");

    // Update daily login info
    user.dailyLogin.lastLoginDate = today;
    if (user.dailyLogin.month !== today.getMonth()) {
      user.dailyLogin.month = today.getMonth();
      user.dailyLogin.monthlyEarned = 0;
    }
    user.dailyLogin.monthlyEarned += pointsToAdd;

    await user.save();

    // Emit real-time points update
    if (io) {
      io.to(user._id.toString()).emit("pointsUpdate", { points: user.points });
    }

    console.log("Daily login reward given:", pointsToAdd);
  } else {
    console.log("Daily login skipped: already claimed today");
  }

  return user.dailyLogin;
};