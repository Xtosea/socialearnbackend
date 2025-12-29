// utils/pointsHelpers.js
import History from "../models/HistoryLog.js";

/**
 * Update user points and log history, then emit socket update
 * @param {Object} params
 * @param {Object} params.user - Mongoose User document
 * @param {number} params.amount - Points to add/subtract
 * @param {string} params.taskType - e.g., "video-view", "daily-login"
 * @param {ObjectId} [params.taskId] - Optional Task reference
 * @param {string} [params.description] - Description
 * @param {Object} [params.metadata] - Extra metadata
 * @param {Object} [params.req] - Express req object to access io
 */
export const updateUserPoints = async ({
  user,
  amount,
  taskType,
  taskId = null,
  description = "",
  metadata = {},
  req = null,
}) => {
  user.points += amount;
  await user.save();

  const historyEntry = await History.create({
    user: user._id,
    taskType,
    taskId,
    amount,
    description,
    metadata,
  });

  // Emit socket update if req.app.get('io') is available
  if (req?.app?.get("io")) {
    req.app.get("io").to(user._id.toString()).emit("pointsUpdate", {
      points: user.points,
      newEntryId: historyEntry._id,
    });
  }

  return user;
};