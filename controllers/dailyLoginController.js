import User from "../models/User.js";
import { dailyLoginRewardHelper } from "../utils/dailyLoginHelper.js";

export const dailyLoginReward = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const io = req.app.get("io"); // optional
    const result = await dailyLoginRewardHelper(user, io);

    return res.status(200).json(result);
  } catch (err) {
    console.error("Daily login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};