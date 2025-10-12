import User from "../models/User.js";

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

    // Emit Socket.IO update
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

// ================= LEADERBOARD =================
export const rewardLeaderboard = async (req, res) => {
  const { amount } = req.body;
  try {
    const topUsers = await User.find().sort({ points: -1 }).limit(3);

    const io = req.app.get("io");

    for (let u of topUsers) {
      u.points += Number(amount);
      await u.save();

      // Emit update to each top user
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