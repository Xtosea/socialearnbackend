import User from "../models/User.js";
import { updateUserPoints } from "./pointsHelpers.js";

// DAILY LOGIN HELPER
export const dailyLoginRewardHelper = async (user, io = null) => {
  const today = new Date();
  const day = today.getDate();
  const month = today.getMonth();
  const year = today.getFullYear();

  // Initialize dailyLogin if missing
  if (!user.dailyLogin || user.dailyLogin.month !== month) {
    user.dailyLogin = {
      claimedDays: [],
      month,
      year,
      streak: 0,
    };
  }

  const { claimedDays, streak } = user.dailyLogin;

  // Check if user has already claimed today
  if (!claimedDays.includes(day)) {
    // ✅ Add today's claim
    claimedDays.push(day);

    // ✅ Increase streak (or reset if last claim was not yesterday)
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const lastClaimedDay = claimedDays[claimedDays.length - 2];

    if (lastClaimedDay === yesterday.getDate()) {
      user.dailyLogin.streak += 1;
    } else {
      user.dailyLogin.streak = 1; // reset streak
    }

    // ✅ Reward points
    await updateUserPoints({
      user,
      amount: 500, // example daily reward points
      taskType: "daily-login",
      description: "Daily login reward",
      io,
    });

    await user.save();
  }

  return {
    claimedDays: user.dailyLogin.claimedDays,
    month,
    year,
    streak: user.dailyLogin.streak,
  };
};