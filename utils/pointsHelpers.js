// utils/pointsHelpers.js
import History from "../models/HistoryLog.js";

export const updateUserPoints = async ({
  user,
  amount,
  taskType,
  taskId,
  description,
  metadata = {},
}) => {
  user.points += amount;
  await user.save();

  await History.create({
    user: user._id,
    taskType,
    taskId,
    amount,
    description,
    metadata,
  });

  return user;
};