import Task from "../models/Task.js";
import User from "../models/User.js";
import History from "../models/HistoryLog.js";
import PromotionSettings from "../models/PromotionSettings.js";
import { detectPlatformFromUrl } from "../utils/detectPlatforms.js";

/* ======================================================
   🔹 HELPERS
====================================================== */

const logHistory = async ({
  user,
  taskType,
  taskId,
  amount,
  description,
  metadata = {},
}) => {
  try {
    await History.create({
      user,
      taskType,
      taskId,
      amount,
      description,
      metadata,
    });
  } catch (err) {
    console.error("History log error:", err.message);
  }
};

const updateUserPoints = async ({
  user,
  amount,
  taskType,
  taskId,
  description,
  metadata,
}) => {
  user.points += amount;
  await user.save();

  await logHistory({
    user: user._id,
    taskType,
    taskId,
    amount,
    description,
    metadata,
  });

  return user;
};

const emitPointsUpdate = (req, user) => {
  const io = req.app.get("io");
  if (io) {
    io.to(user._id.toString()).emit("pointsUpdate", {
      points: user.points,
    });
  }
};

/* ======================================================
   🎬 VIDEO TASKS
====================================================== */

export const addVideoTask = async (req, res) => {
  try {
    const { url, platform, duration, maxWatches, points } = req.body;

    if (!url || !platform || !duration || !maxWatches || !points) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const fund = points * maxWatches;
    const user = await User.findById(req.user.id);

    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.points < fund)
      return res.status(400).json({ message: "Insufficient points" });

    await updateUserPoints({
      user,
      amount: -fund,
      taskType: "video-task-fund",
      taskId: null,
      description: "Points used to fund a video watch task",
      metadata: { url, platform, duration, maxWatches, points },
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

    res.status(201).json({
      task,
      points: user.points,
      message: "Video task created successfully!",
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
    if (!task || task.type !== "video")
      return res.status(404).json({ message: "Video task not found" });

    res.json({ message: "Watch started", taskId: task._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const completeWatch = async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task || task.type !== "video")
      return res.status(404).json({ message: "Video task not found" });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (task.completedBy.includes(user._id))
      return res.status(400).json({ message: "Already completed" });

    if (task.fund < task.points)
      return res.status(400).json({ message: "Task fund exhausted" });

    task.watches += 1;
    task.fund -= task.points;
    task.completedBy.push(user._id);
    await task.save();

    await updateUserPoints({
      user,
      amount: task.points,
      taskType: "video-view",
      taskId: task._id,
      description: "Points earned from video watch",
      metadata: { url: task.url, platform: task.platform },
    });

    emitPointsUpdate(req, user);

    res.json({
      message: `✅ You earned ${task.points} points`,
      points: user.points,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ======================================================
   💬 SOCIAL TASKS (LIKES / FOLLOWS / COMMENTS)
====================================================== */

export const addSocialTask = async (req, res) => {
  try {
    const { url, actions, platform, requiredActions } = req.body;

    if (!url || !actions?.length) {
      return res.status(400).json({ message: "Invalid social task data" });
    }

    const detectedPlatform = platform || detectPlatformFromUrl(url);
    if (detectedPlatform === "unknown") {
      return res.status(400).json({ message: "Unsupported platform" });
    }

    // ✅ Reward comes from first action
    const rewardPerAction = actions[0].points;

    const task = await Task.create({
      url,
      platform: detectedPlatform,
      type: "social",
      actions,
      points: rewardPerAction,
      requiredActions: requiredActions || actions.length,
      createdBy: req.user.id,
      completedBy: [],
    });

    res.status(201).json({
      task,
      message: "Social task created successfully!",
    });
  } catch (err) {
    console.error("addSocialTask error:", err);
    res.status(500).json({ error: err.message });
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

export const getPlatformActionTasks = async (req, res) => {
  try {
    const { platform } = req.params;

    const tasks = await Task.find({
      type: "social",
      platform: new RegExp(`^${platform}$`, "i"),
    })
      .populate("createdBy", "username")
      .populate("completedBy", "username")
      .sort({ createdAt: -1 });

    // Ensure all tasks have a points field
    const tasksWithPoints = tasks.map(t => ({
      _id: t._id,
      url: t.url,
      platform: t.platform,
      type: t.type,
      actions: t.actions || [],
      requiredActions: t.requiredActions || (t.actions ? t.actions.length : 1),
      createdBy: t.createdBy,
      completedBy: t.completedBy,
      points: t.points || (t.actions && t.actions[0] ? t.actions[0].points : 10), // default 10 if missing
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));

    res.json(tasksWithPoints);
  } catch (err) {
    console.error("getPlatformActionTasks error:", err);
    res.status(500).json({ error: err.message });
  }
};
export const completeSocialAction = async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task || task.type !== "social")
      return res.status(404).json({ message: "Social task not found" });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (task.completedBy.includes(user._id))
      return res.status(400).json({ message: "Already completed" });

    task.completedBy.push(user._id);
    await task.save();

    await updateUserPoints({
      user,
      amount: task.points,
      taskType: "social-action",
      taskId: task._id,
      description: "Completed social task",
      metadata: { url: task.url, platform: task.platform },
    });

    emitPointsUpdate(req, user);

    res.json({
      message: `✅ You earned ${task.points} points`,
      points: user.points,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ======================================================
   💰 PROMOTIONS
====================================================== */

export const getPromotedTasksByPlatform = async (req, res) => {
  try {
    const { type, platform } = req.params;

    const tasks = await Task.find({
      type,
      platform: new RegExp(`^${platform}$`, "i"),
      promoted: true,
    }).sort({ createdAt: -1 });

    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const promoteTask = async (req, res) => {
  try {
    const { taskId, cost } = req.body;

    const user = await User.findById(req.user.id);
    const task = await Task.findById(taskId);

    if (!user || !task)
      return res.status(404).json({ message: "User or task not found" });

    if (user.points < cost)
      return res.status(400).json({ message: "Insufficient points" });

    await updateUserPoints({
      user,
      amount: -cost,
      taskType: "task-promotion",
      taskId: task._id,
      description: "Task promoted",
    });

    task.promoted = true;
    await task.save();

    emitPointsUpdate(req, user);

    res.json({
      message: "Task promoted successfully!",
      remainingPoints: user.points,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};