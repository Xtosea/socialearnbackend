// utils/dailyLoginHelper.js
import { updateUserPoints } from "./pointsHelpers.js"; // your existing points updater

export const dailyLoginRewardHelper = async (user) => {
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

  // Compare only the date portion, ignoring hours/minutes/seconds
  const isSameDay =
    lastLogin &&
    lastLogin.getFullYear() === today.getFullYear() &&
    lastLogin.getMonth() === today.getMonth() &&
    lastLogin.getDate() === today.getDate();

  if (!isSameDay) {
    // Award daily points (example: 10 points)
    const pointsToAdd = 10;

    // Update user's points and history
    await updateUserPoints(user._id, pointsToAdd, "Daily login reward");

    // Update last login date and monthly stats
    user.dailyLogin.lastLoginDate = today;
    if (user.dailyLogin.month !== today.getMonth()) {
      user.dailyLogin.month = today.getMonth();
      user.dailyLogin.monthlyEarned = 0;
    }
    user.dailyLogin.monthlyEarned += pointsToAdd;

    await user.save();

    console.log("Daily login reward given:", pointsToAdd);
  } else {
    console.log("Daily login skipped: already claimed today");
  }
};