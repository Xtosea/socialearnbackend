import User from "../models/User.js";
import { updateUserPoints } from "../utils/pointsHelpers.js";
import { dailyLoginRewardHelper } from "../utils/dailyLoginHelper.js";

// Claim daily login reward
export const claimDailyLogin = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const io = req.app.get("io"); // optional: socket.io for real-time points update
    const dailyLogin = await dailyLoginRewardHelper(user, io);

    res.json({ message: "Daily login claimed", dailyLogin, points: user.points });
  } catch (err) {
    console.error("Claim daily login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};