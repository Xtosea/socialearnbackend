// utils/dailyLoginHelper.js
import { updateUserPoints } from "./pointsHelpers.js";

/**
 * Handles daily login reward:
 * - Gives points if not already claimed today
 * - Resets monthly earned points if a new month starts
 * - Emits real-time points update if Socket.IO instance is passed
 * @param {Object} user - Mongoose user document
 * @param {Object|null} io - Optional Socket.IO server instance
 * @returns {Object} Updated dailyLogin info
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

  const isSameDay =
    lastLogin &&
    lastLogin.getFullYear() === today.getFullYear() &&
    lastLogin.getMonth() === today.getMonth() &&
    lastLogin.getDate() === today.getDate();

  if (!isSameDay) {
    const pointsToAdd = 10; // Daily login points

    // Update points using helper
    await updateUserPoints(user._id, pointsToAdd, "Daily login reward");

    // Update dailyLogin info
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