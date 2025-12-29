// utils/pointsHelpers.js
import HistoryLog from "../models/HistoryLog.js";

/**
 * Add points to a user and log history
 * @param {Object} options
 * @param {import("../models/User.js").default} options.user - Mongoose user document
 * @param {number} options.amount - Points to add
 * @param {string} options.taskType - Type of task (e.g., 'daily-login', 'referral-bonus')
 * @param {string|null} options.taskId - Optional related task ID
 * @param {string} options.description - Description of the points
 * @param {Object} [options.metadata] - Optional additional info
 * @param {Object} [options.req] - Optional Express request object to emit socket events
 */
export const updateUserPoints = async ({
  user,
  amount,
  taskType,
  taskId = null,
  description,
  metadata = {},
  req = null,
}) => {
  if (!user || !amount || !taskType || !description) {
    throw new Error("Missing required parameters for updateUserPoints");
  }

  // Add points
  user.points = (user.points || 0) + amount;
  await user.save();

  // Log history
  await HistoryLog.create({
    user: user._id,
    taskType,
    taskId,
    amount,
    description,
    metadata,
  });

  // Emit real-time update via Socket.IO (optional)
  if (req?.app?.get("io")) {
    const io = req.app.get("io");
    io.to(user._id.toString()).emit("pointsUpdate", { points: user.points });
  }

  return user.points; // return updated points
};