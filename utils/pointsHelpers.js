// utils/pointsHelpers.js
import User from "../models/User.js";

/**
 * Adds points to a user and logs the action in their history
 * @param {String|ObjectId} userId - The user's _id
 * @param {Number} amount - Points to add
 * @param {String} taskType - e.g., "Daily login reward", "Referral bonus"
 * @param {String|null} taskId - Optional task id
 * @param {String} description - Optional description
 * @param {Object} metadata - Optional metadata object
 * @returns {Object} Updated user document
 */
export const updateUserPoints = async (
  userId,
  amount,
  taskType,
  taskId = null,
  description = "",
  metadata = {}
) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  // Add points
  user.points += amount;

  // Log in history (make sure your User schema has a 'history' array)
  if (!user.history) user.history = [];
  user.history.push({
    taskType,
    taskId,
    amount,
    description,
    metadata,
    date: new Date(),
  });

  await user.save();
  return user;
};

/**
 * Optional: deduct points
 */
export const deductUserPoints = async (userId, amount, description = "") => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  user.points -= amount;
  if (!user.history) user.history = [];
  user.history.push({
    taskType: "Deduction",
    amount: -amount,
    description,
    date: new Date(),
  });

  await user.save();
  return user;
};