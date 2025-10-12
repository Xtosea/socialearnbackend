import Task from "../models/Task.js";
import User from "../models/User.js";
import PromotionSettings from "../models/PromotionSettings.js";
import History from "../models/HistoryLog.js";

// ---------------------------
// Helper: create history log
// ---------------------------
const logHistory = async ({ user, taskType, taskId, amount, description, metadata = {} }) => {
  try {
    const entry = await History.create({ user, taskType, taskId, amount, description, metadata });
    console.log("✅ History logged:", entry);
  } catch (err) {
    console.error("History log error:", err.message);
  }
};

// ---------------------------
// Helper: update user points and log
// ---------------------------
const updateUserPoints = async ({ user, amount, taskType, taskId, description, metadata }) => {
  user.points += amount;
  await user.save();
  await logHistory({ user: user._id, taskType, taskId, amount, description, metadata });
  return user;
};

// ---------------------------
// Helper: emit points update via socket
// ---------------------------
const emitPointsUpdate = (req, user) => {
  const io = req.app.get("io");
  if (io) io.to(user._id.toString()).emit("pointsUpdate", { points: user.points });
};

// ---------------------------
// VIDEO TASKS
// ---------------------------
export const addVideoTask = async (req, res) => {
  try {
    const { url, platform, duration, maxWatches, points } = req.body;
    if (!url || !platform || !duration || !maxWatches || !points) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const fund = points * maxWatches;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.points < fund) return res.status(400).json({ message: "Insufficient points" });

    // Deduct points to fund task
    await updateUserPoints({
      user,
      amount: -fund,
      taskType: "video-view",
      taskId: null,
      description: "Points deducted to fund a video watch task",
      metadata: { url, platform, duration, maxWatches, pointsPerView: points }
    });

    const task = new Task({
      url,
      platform,
      duration,
      maxWatches,
      points,
      fund,
      type: "video",
      createdBy: user._id,
      watches: 0,
      completedBy: [],
    });
    await task.save();

    emitPointsUpdate(req, user);

    res.status(201).json({
      task,
      points: user.points,
      message: "Video watch task created successfully!"
    });
  } catch (err) {
    console.error("addVideoTask error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const getVideoTasks = async (req, res) => {
  try {
    const filter = { type: "video" };
    if (req.query.platform) filter.platform = req.query.platform;
    const tasks = await Task.find(filter).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const startWatch = async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task || task.type !== "video") return res.status(404).json({ message: "Video task not found" });
    res.json({ message: "Watch started", taskId: task._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const completeWatch = async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task || task.type !== "video") return res.status(404).json({ message: "Video task not found" });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (task.fund < task.points) return res.status(400).json({ message: "Insufficient task fund" });

    task.watches += 1;
    task.fund -= task.points;
    task.completedBy.push(user._id);
    await task.save();

    await updateUserPoints({
      user,
      amount: task.points,
      taskType: "video-view",
      taskId: task._id,
      description: "Points earned for watching a video task",
      metadata: { url: task.url, platform: task.platform }
    });

    emitPointsUpdate(req, user);

    res.json({
      message: `✅ Watch complete! You earned ${task.points} points.`,
      points: user.points,
      taskProgress: { currentViews: task.watches, remainingFund: task.fund }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ---------------------------
// SOCIAL TASKS
// ---------------------------
export const addSocialTask = async (req, res) => {
  try {
    const { url, platform, type, points, requiredActions } = req.body;
    if (!url || !platform || !type || !points) return res.status(400).json({ message: "Missing required fields" });

    const task = new Task({
      url,
      platform,
      type,
      points,
      requiredActions: requiredActions || 1,
      createdBy: req.user.id,
      completedBy: [],
    });
    await task.save();
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getSocialTasks = async (req, res) => {
  try {
    const filter = { type: { $in: ["like", "comment", "share", "follow"] } };
    if (req.query.platform) filter.platform = req.query.platform;
    const tasks = await Task.find(filter).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const completeSocialAction = async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task || !["like", "comment", "share", "follow"].includes(task.type)) return res.status(404).json({ message: "Social task not found" });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    task.completedBy.push(user._id);
    await task.save();

    await updateUserPoints({
      user,
      amount: task.points,
      taskType: "action",
      taskId: task._id,
      description: "Points earned for completing a social task",
      metadata: { url: task.url, platform: task.platform }
    });

    emitPointsUpdate(req, user);

    res.json({ message: `🎉 ${task.type} completed! You earned ${task.points} points.`, points: user.points });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ---------------------------
// PROMOTIONS
// ---------------------------
export const getPromotedTasksByPlatform = async (req, res) => {
  try {
    let { type, platform } = req.params;
    if (!type || type === "watch") type = "video";

    const tasks = await Task.find({ type, platform, promoted: true }).sort({ createdAt: -1 });
    res.json({ tasks });
  } catch (err) {
    console.error("getPromotedTasksByPlatform error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const promoteTask = async (req, res) => {
  try {
    const { taskId } = req.body;
    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const cost = 50;
    if (user.points < cost) return res.status(400).json({ message: "Not enough points to promote" });

    await updateUserPoints({
      user,
      amount: -cost,
      taskType: "promotion",
      taskId: task._id,
      description: "Points deducted to promote a task",
      metadata: { url: task.url, platform: task.platform }
    });

    task.promoted = true;
    await task.save();

    emitPointsUpdate(req, user);

    res.json({ message: "Task promoted successfully!", remainingPoints: user.points, task });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};