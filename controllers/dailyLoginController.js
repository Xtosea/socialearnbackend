import User from "../models/User.js";
import { dailyLoginRewardHelper } from "../utils/dailyLoginHelper.js";

// ================= DAILY LOGIN CONTROLLER =================
export const dailyLoginReward = async (req, res) => {
  try {
    if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const io = req.app.get("io"); // Optional Socket.IO
    const result = await dailyLoginRewardHelper(user, io);

    res.status(200).json(result);
  } catch (err) {
    console.error("Daily login reward error:", err);
    res.status(500).json({ message: "Server error" });
  }
};