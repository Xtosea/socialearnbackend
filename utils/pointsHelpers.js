import HistoryLog from "../models/HistoryLog.js";

export const updateUserPoints = async ({
  user,
  amount,
  taskType,
  taskId = null,
  description,
  req = null,
}) => {
  if (!user || !amount) throw new Error("Invalid points update");

  // Add points
  user.points = (user.points || 0) + amount;
  await user.save();

  // Save history
  await HistoryLog.create({
    user: user._id,
    taskType,
    taskId,
    amount,
    description,
  });

  // Optional realtime update
  if (req?.app?.get("io")) {
    req.app
      .get("io")
      .to(user._id.toString())
      .emit("pointsUpdate", { points: user.points });
  }

  return user.points;
};