// controllers/taskController.js
import Task from "../models/Task.js";
import User from "../models/User.js";
import History from "../models/HistoryLog.js";
import PromotionSettings from "../models/PromotionSettings.js";
import { detectPlatformFromUrl } from "../utils/detectPlatforms.js";

// ======================
// 🔹 HELPERS
// ======================

const logHistory = async ({ user, taskType, taskId, amount, description, metadata = {} }) => {
  try {
    await History.create({ user, taskType, taskId, amount, description, metadata });
  } catch (err) {
    console.error("History log error:", err.message);
  }
};

const updateUserPoints = async ({ user, amount, taskType, taskId, description, metadata }) => {
  user.points += amount;
  await user.save();
  await logHistory({ user: user._id, taskType, taskId, amount, description, metadata });
  return user;
};

const emitPointsUpdate = (req, user) => {
  const io = req.app.get("io");
  if (io) io.to(user._id.toString()).emit("pointsUpdate", { points: user.points });
};

// ======================
// 🎬 VIDEO TASKS
// ======================

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

    await updateUserPoints({
      user,
      amount: -fund,
      taskType: "video-task-fund",
      taskId: null,
      description: "Points deducted to fund a video watch task",
      metadata: { url, platform, duration, maxWatches, pointsPerView: points },
    });

    const task = await Task.create({
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

    emitPointsUpdate(req, user);

    res.status(201).json({ task, points: user.points, message: "Video task created!" });
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
      metadata: { url: task.url, platform: task.platform },
    });

    emitPointsUpdate(req, user);

    res.json({
      message: `✅ Watch complete! You earned ${task.points} points.`,
      points: user.points,
      taskProgress: { currentViews: task.watches, remainingFund: task.fund },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ======================
// 💬 SOCIAL TASKS
// ======================

export const addSocialTask = async (req, res) => {
  try {
    const { url, actions, platform, type, points, requiredActions } = req.body;
    const detectedPlatform = platform || detectPlatformFromUrl(url);

    if (detectedPlatform === "unknown") return res.status(400).json({ message: "Invalid or unsupported URL" });
    if (!url || !points) return res.status(400).json({ message: "Missing required fields" });

    const sanitizedActions = (actions || []).map(a => ({ type: a.type, points: a.points || points }));
    if (sanitizedActions.length === 0) sanitizedActions.push({ type: "like", points });

    const task = await Task.create({
      url,
      platform: detectedPlatform,
      type: type || "social",
      actions: sanitizedActions,
      points,
      requiredActions: requiredActions || 1,
      createdBy: req.user.id,
      completedBy: [],
    });

    res.status(201).json({ task, message: "Social task created successfully!" });
  } catch (err) {
    console.error("addSocialTask error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const performTaskAction = async (req, res) => {
  try {
    const { taskId, url, action, quantity } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const ACTION_POINTS = { like: 5, share: 10, comment: 15, follow: 20, subscribe: 25 };
    const actionType = action || "like";
    const totalPoints = ACTION_POINTS[actionType] * (quantity || 1);

    let task = taskId ? await Task.findById(taskId) : await Task.findOne({ url });
    if (!task) {
      const platform = detectPlatformFromUrl(url);
      if (platform === "unknown") return res.status(400).json({ message: "Invalid URL" });

      const actionsArray = Array.from({ length: quantity || 1 }, () => ({
        type: actionType,
        points: ACTION_POINTS[actionType],
      }));

      task = await Task.create({
        url,
        platform,
        type: "social",
        actions: actionsArray,
        points: ACTION_POINTS[actionType],
        requiredActions: quantity || 1,
        createdBy: user._id,
        completedBy: [],
      });
    }

    if (task.completedBy.includes(user._id))
      return res.status(400).json({ message: "You already completed this task" });

    if (user.points < totalPoints)
      return res.status(400).json({ message: "Insufficient points" });

    await updateUserPoints({
      user,
      amount: -totalPoints,
      taskType: "social-task-fund",
      taskId: task._id,
      description: `Created ${actionType} task for ${task.platform}`,
      metadata: { url, actionType, quantity },
    });

    emitPointsUpdate(req, user);

    res.json({ message: `✅ ${actionType} task created successfully!`, task, remainingPoints: user.points });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getSocialTasks = async (req, res) => {
  try {
    const filter = { type: "social" };
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
    if (!task || task.type !== "social") return res.status(404).json({ message: "Social task not found" });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (task.completedBy.includes(user._id))
      return res.status(400).json({ message: "You already completed this task" });

    task.completedBy.push(user._id);
    await task.save();

    await updateUserPoints({
      user,
      amount: task.points,
      taskType: "social-action",
      taskId: task._id,
      description: `Points earned for completing a social task`,
      metadata: { url: task.url, platform: task.platform },
    });

    emitPointsUpdate(req, user);

    res.json({ message: `✅ Task completed! You earned ${task.points} points.`, points: user.points });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ======================
// 🔹 FETCH TASKS BY PLATFORM
// ======================

// controllers/taskController.js

// controllers/taskController.js

export const getPlatformActionTasks = async (req, res) => {
  try {
    const { platform } = req.params;

    if (!platform) {
      console.warn("⚠️ No platform provided in request params");
      return res.status(400).json({ message: "Platform is required" });
    }

    console.log(`📡 Fetching tasks for platform: ${platform}`);

    // Confirm Task model is working
    if (!Task) {
      console.error("❌ Task model not found or not imported correctly!");
      return res.status(500).json({ message: "Internal Task model error" });
    }

    // Try simple find first to isolate issue
    const tasks = await Task.find({
      type: "social",
      platform: new RegExp(`^${platform}$`, "i"),
    })
      .populate("createdBy", "username name")
      .populate("completedBy", "username name")
      .sort({ createdAt: -1 });

    console.log(`✅ Found ${tasks.length} tasks for ${platform}`);
    return res.status(200).json(tasks);
  } catch (err) {
    console.error("🔥 getPlatformActionTasks fatal error:");
    console.error(err.stack || err.message);
    res.status(500).json({
      message: "Server error while fetching tasks",
      error: err.message,
      stack: err.stack,
    });
  }
};
// ======================
// 💰 PROMOTIONS
// ======================

export const getPromotedTasksByPlatform = async (req, res) => {
  try {
    const { type, platform } = req.params;
    const tasks = await Task.find({ type, platform: new RegExp(`^${platform}$`, "i"), promoted: true }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const promoteTask = async (req, res) => {
  try {
    const { taskId, cost } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    // Deduct promotion cost
    if (user.points < cost) return res.status(400).json({ message: "Insufficient points" });
    await updateUserPoints({
      user,
      amount: -cost,
      taskType: "promote-task",
      taskId: task._id,
      description: `Promoted task ${taskId}`,
    });

    task.promoted = true;
    await task.save();

    emitPointsUpdate(req, user);

    res.json({ message: "Task promoted successfully!", task, remainingPoints: user.points });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};