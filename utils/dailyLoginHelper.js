import { updateUserPoints } from "./pointsHelpers.js";
import User from "../models/User.js";

export const dailyLoginRewardHelper = async (user, io = null) => {
  const today = new Date();
  const lastLogin = user.dailyLogin?.lastLoginDate || null;

  // Reset streak if month changed
  if (user.dailyLogin?.month !== today.getMonth()) {
    user.dailyLogin.month = today.getMonth();
    user.dailyLogin.monthlyTarget = 0;
    user.dailyLogin.monthlyEarned = 0;
    user.dailyLogin.streak = 0;
  }

  // Already claimed today
  if (lastLogin && new Date(lastLogin).toDateString() === today.toDateString()) {
    return {
      claimed: false,
      message: "Already claimed today",
      streak: user.dailyLogin.streak || 0,
    };
  }

  // Update streak
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (lastLogin && new Date(lastLogin).toDateString() === yesterday.toDateString()) {
    user.dailyLogin.streak = (user.dailyLogin.streak || 0) + 1;
  } else {
    user.dailyLogin.streak = 1;
  }

  // Reward points (e.g., 100 per day, double on 7-day streak)
  let reward = 100;
  if (user.dailyLogin.streak % 7 === 0) reward = 200;

  // Update user points
  await updateUserPoints({
    user,
    amount: reward,
    taskType: "daily-login",
    description: `Daily login reward (day ${user.dailyLogin.streak})`,
    io,
  });

  // Save last login date
  user.dailyLogin.lastLoginDate = today;
  user.dailyLogin.monthlyTarget += 1;
  user.dailyLogin.monthlyEarned += reward;

  await user.save();

  return {
    claimed: true,
    reward,
    streak: user.dailyLogin.streak,
    monthlyTarget: user.dailyLogin.monthlyTarget,
    monthlyEarned: user.dailyLogin.monthlyEarned,
  };
};