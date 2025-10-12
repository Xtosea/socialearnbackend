import express from "express";
import auth from "../middleware/auth.js";
import User from "../models/User.js";
import History from "../models/HistoryLog.js";

const router = express.Router();

// ---------------------------
// Helper: log wallet history
// ---------------------------
const logHistory = async ({ user, taskType, amount, description, metadata = {} }) => {
  try {
    await History.create({ user, taskType, amount, description, metadata });
  } catch (err) {
    console.error("Wallet history log error:", err.message);
  }
};

// ---------------------------
// Get wallet (balance + history)
// ---------------------------
router.get("/", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("points username");
    if (!user) return res.status(404).json({ message: "User not found" });

    const history = await History.find({ user: user._id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      balance: user.points,
      username: user.username,
      history: history.map((h) => ({
        type: h.taskType,
        amount: h.amount,
        date: h.createdAt,
        fromUser: h.metadata?.fromUsername ? { username: h.metadata.fromUsername } : null,
        toUser: h.metadata?.toUsername ? { username: h.metadata.toUsername } : null,
        description: h.description,
      })),
    });
  } catch (err) {
    console.error("Get wallet error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------------------------
// Redeem points
// ---------------------------
router.post("/redeem", auth, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ message: "Invalid amount" });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.points < amount) return res.status(400).json({ message: "Insufficient points" });

    // Deduct points
    user.points -= amount;
    await user.save();

    // Log redeem history
    await logHistory({
      user: user._id,
      taskType: "redeem",
      amount: -amount,
      description: `Redeemed ${amount} points`,
    });

    // Return updated wallet
    const history = await History.find({ user: user._id }).sort({ createdAt: -1 }).lean();
    res.json({
      message: `Redeemed ${amount} points successfully`,
      balance: user.points,
      history: history.map((h) => ({
        type: h.taskType,
        amount: h.amount,
        date: h.createdAt,
        fromUser: h.metadata?.fromUsername ? { username: h.metadata.fromUsername } : null,
        toUser: h.metadata?.toUsername ? { username: h.metadata.toUsername } : null,
        description: h.description,
      })),
    });
  } catch (err) {
    console.error("Redeem error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------------------------
// Transfer points by username
// ---------------------------
router.post("/transfer", auth, async (req, res) => {
  try {
    const { username, amount } = req.body;
    if (!username || !amount || amount <= 0) return res.status(400).json({ message: "Invalid data" });

    const sender = await User.findById(req.user.id);
    const receiver = await User.findOne({ username });

    if (!sender) return res.status(404).json({ message: "Sender not found" });
    if (!receiver) return res.status(404).json({ message: "Recipient not found" });
    if (sender._id.equals(receiver._id)) return res.status(400).json({ message: "Cannot transfer to yourself" });
    if (sender.points < amount) return res.status(400).json({ message: "Insufficient points" });

    // Deduct sender points
    sender.points -= amount;
    await sender.save();

    await logHistory({
      user: sender._id,
      taskType: "transfer_out",
      amount: -amount,
      description: `Transferred ${amount} points to ${receiver.username}`,
      metadata: { to: receiver._id, toUsername: receiver.username },
    });

    // Add points to receiver
    receiver.points += amount;
    await receiver.save();

    await logHistory({
      user: receiver._id,
      taskType: "transfer_in",
      amount: amount,
      description: `Received ${amount} points from ${sender.username}`,
      metadata: { from: sender._id, fromUsername: sender.username },
    });

    // Return updated wallet for sender
    const history = await History.find({ user: sender._id }).sort({ createdAt: -1 }).lean();
    res.json({
      message: `Transferred ${amount} points to ${receiver.username} successfully`,
      balance: sender.points,
      history: history.map((h) => ({
        type: h.taskType,
        amount: h.amount,
        date: h.createdAt,
        fromUser: h.metadata?.fromUsername ? { username: h.metadata.fromUsername } : null,
        toUser: h.metadata?.toUsername ? { username: h.metadata.toUsername } : null,
        description: h.description,
      })),
    });
  } catch (err) {
    console.error("Transfer error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;