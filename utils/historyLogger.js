import HistoryLog from "../models/HistoryLog.js";

export const addHistory = async (userId, taskType, taskId, amount, metadata = {}) => {
  try {
    const entry = await HistoryLog.create({
      user: userId,
      taskType,
      taskId,
      amount,
      metadata,
    });
    return entry;
  } catch (err) {
    console.error("Failed to log history:", err.message);
  }
};