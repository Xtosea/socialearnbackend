import { updateUserPoints } from "./pointsHelpers.js";

export const dailyLoginRewardHelper = async (user, io = null) => {
  const today = new Date();
  const currentMonth = today.getMonth();

  if (!user.dailyLogin) {
    user.dailyLogin = {
      lastLoginDate: null,
      monthlyTarget: Math.floor(Math.random() * 950) + 50,
      monthlyEarned: 0,
      month: currentMonth,
    };
  }

  // reset month
  if (user.dailyLogin.month !== currentMonth) {
    user.dailyLogin.month = currentMonth;
    user.dailyLogin.monthlyEarned = 0;
    user.dailyLogin.lastLoginDate = null;
    user.dailyLogin.monthlyTarget = Math.floor(Math.random() * 950) + 50;
  }

  const last = user.dailyLogin.lastLoginDate;
  const sameDay =
    last &&
    new Date(last).toDateString() === today.toDateString();

  if (sameDay) {
    return {
      earnedToday: 0,
      dailyLogin: user.dailyLogin,
      message: "Already claimed today",
    };
  }

  const daysInMonth = new Date(
    today.getFullYear(),
    currentMonth + 1,
    0
  ).getDate();

  const pointsToday = Math.floor(
    user.dailyLogin.monthlyTarget / daysInMonth
  );

  await updateUserPoints(
    user._id,
    pointsToday,
    "daily-login",
    null,
    "Daily login reward"
  );

  user.dailyLogin.lastLoginDate = today;
  user.dailyLogin.monthlyEarned += pointsToday;
  await user.save();

  if (io) {
    io.to(user._id.toString()).emit("pointsUpdate", {
      points: user.points,
    });
  }

  return {
    earnedToday: pointsToday,
    dailyLogin: user.dailyLogin,
    message: "Reward claimed",
  };
};