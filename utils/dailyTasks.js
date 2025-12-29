// utils/dailyTasks.js
import User from "../models/User.js";
import { updateUserPoints } from "./pointsHelpers.js";

/**
 * Give daily login points if user hasn't received today
 */
export const handleDailyLogin = async (user, req) => {
  const today = new Date().toDateString();

  if (user.lastLogin?.toDateString() !== today) {
    // Give points
    await updateUserPoints({
      user,
      amount: 100, // e.g., daily login points
      taskType: "daily-login",
      description: "Daily login bonus",
      req,
    });

    user.lastLogin = new Date();
    await user.save();
  }
};