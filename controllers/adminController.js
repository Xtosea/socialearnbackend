import User from "../models/User.js";
import Task from "../models/Task.js";
import History from "../models/HistoryLog.js";

// Admin wallet (for display only)
let adminWallet = 0;

// ================= USERS =================
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Error fetching users" });
  }
};

// ================= WALLET =================
export const getAdminWallet = (req, res) => {
  res.json({ points: adminWallet });
};

export const addToAdminWallet = (req, res) => {
  const { amount } = req.body;
  adminWallet += Number(amount);
  res.json({ points: adminWallet });
};

export const resetAdminWallet = (req, res) => {
  adminWallet = 0;
  res.json({ points: adminWallet });
};

// ================= USER POINTS =================
export const addPointsToUser = async (req, res) => {
  const { username, amount } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.points += Number(amount);
    await user.save();

    const io = req.app.get("io");
    io.to(user._id.toString()).emit("walletUpdated", { 
      userId: user._id.toString(),
      balance: user.points 
    });

    res.json({ message: "Points added", user });
  } catch (err) {
    res.status(500).json({ message: "Error adding points" });
  }
};

export const deductPointsFromUser = async (req, res) => {
  const { username, amount } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.points < amount) 
      return res.status(400).json({ message: "Not enough points" });

    user.points -= Number(amount);
    await user.save();

    const io = req.app.get("io");
    io.to(user._id.toString()).emit("walletUpdated", { 
      userId: user._id.toString(),
      balance: user.points 
    });

    res.json({ message: "Points deducted", user });
  } catch (err) {
    res.status(500).json({ message: "Error deducting points" });
  }
};

// ================= DELETE USERS =================
export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Delete user's tasks and history
    await Task.deleteMany({ createdBy: user._id });
    await History.deleteMany({ user: user._id });

    await user.remove();

    const io = req.app.get("io");
    if (io) io.emit("userDeleted", { userId });

    res.json({ message: "User deleted successfully", userId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================= DELETE VIDEO TASKS =================
export const deleteVideoTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    await task.remove();

    const io = req.app.get("io");
    if (io) io.emit("taskDeleted", { taskId });

    res.json({ message: "Video task deleted successfully", taskId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================= LEADERBOARD =================
export const rewardLeaderboard = async (req, res) => {
  const { amount } = req.body;
  try {
    const topUsers = await User.find().sort({ points: -1 }).limit(3);

    const io = req.app.get("io");

    for (let u of topUsers) {
      u.points += Number(amount);
      await u.save();

      io.to(u._id.toString()).emit("walletUpdated", {
        userId: u._id.toString(),
        balance: u.points
      });
    }

    res.json({ message: "Leaderboard rewarded", topUsers });
  } catch (err) {
    res.status(500).json({ message: "Error rewarding leaderboard" });
  }
};