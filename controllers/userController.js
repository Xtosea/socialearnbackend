import User from "../models/User.js";
import HistoryLog from "../models/HistoryLog.js";

// ================= GET CURRENT USER =================
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= UPDATE PROFILE =================
export const updateProfile = async (req, res) => {
  try {
    const { username, email, country } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) return res.status(404).json({ message: "User not found" });

    if (username) user.username = username;
    if (email) user.email = email;
    if (country) user.country = country;

    await user.save();

    res.json({ message: "Profile updated", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= FOLLOW USER =================
export const followUser = async (req, res) => {
  try {
    const { id } = req.params; // user to follow
    const currentUserId = req.user._id;

    if (id === currentUserId.toString()) {
      return res.status(400).json({ message: "You cannot follow yourself" });
    }

    const userToFollow = await User.findById(id);
    const currentUser = await User.findById(currentUserId);

    if (!userToFollow) return res.status(404).json({ message: "User not found" });
    if (currentUser.following.includes(id)) return res.status(400).json({ message: "Already following this user" });

    currentUser.following.push(id);
    userToFollow.followers.push(currentUserId);

    await currentUser.save();
    await userToFollow.save();

    await HistoryLog.create({
      user: currentUserId,
      taskType: "follow",
      taskId: id,
      amount: 0,
      metadata: { action: "Followed user", username: userToFollow.username },
    });

    res.json({ message: `You are now following ${userToFollow.username}` });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ================= UNFOLLOW USER =================
export const unfollowUser = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id;

    const userToUnfollow = await User.findById(id);
    const currentUser = await User.findById(currentUserId);

    if (!userToUnfollow) return res.status(404).json({ message: "User not found" });
    if (!currentUser.following.includes(id)) return res.status(400).json({ message: "You are not following this user" });

    currentUser.following = currentUser.following.filter(uid => uid.toString() !== id);
    userToUnfollow.followers = userToUnfollow.followers.filter(uid => uid.toString() !== currentUserId.toString());

    await currentUser.save();
    await userToUnfollow.save();

    await HistoryLog.create({
      user: currentUserId,
      taskType: "unfollow",
      taskId: id,
      amount: 0,
      metadata: { action: "Unfollowed user", username: userToUnfollow.username },
    });

    res.json({ message: `You unfollowed ${userToUnfollow.username}` });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ================= GET REFERRALS =================
export const getReferrals = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate(
      "referrals",
      "username email country points createdAt"
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      referralCode: user.referralCode,
      referralCount: user.referrals.length,
      referrals: user.referrals,
    });
  } catch (err) {
    console.error("Get referrals error:", err);
    res.status(500).json({ message: "Server error" });
  }
};