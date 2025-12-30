import { dailyLoginRewardHelper } from "../utils/dailyLoginHelper.js";
import User from "../models/User.js";

export const claimDailyLogin = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Call helper to handle claiming points & streak
    const dailyLogin = await dailyLoginRewardHelper(user, req.app.get("io"));

    // Send back updated user + daily login info
    res.json({ 
      message: "Daily reward claimed successfully!",
      user,        // updated user data including points
      dailyLogin,  // calendar info for frontend
    });
  } catch (err) {
    console.error("Claim daily login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};