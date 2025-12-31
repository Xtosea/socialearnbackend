import User from "../models/User.js";
import HistoryLog from "../models/HistoryLog.js";

// ================= GET CURRENT USER =================
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= GET USER BY ID =================
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password")
      .populate("followers", "username profilePicture")
      .populate("following", "username profilePicture");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error("Get user by id error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= UPDATE PROFILE =================
export const updateProfile = async (req, res) => {
  try {
    const { username, email, country, bio, dob, profilePicture, password } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (username !== undefined) user.username = username;
    if (email !== undefined) user.email = email;
    if (country !== undefined) user.country = country;
    if (bio !== undefined) user.bio = bio;
    if (dob !== undefined) user.dob = dob;
    if (profilePicture !== undefined) user.profilePicture = profilePicture;

    if (password) {
      user.password = password; // bcrypt pre-save hook will hash
    }

    await user.save();

    const updatedUser = await User.findById(user._id).select("-password");

    res.json(updatedUser);
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= FOLLOW USER =================
export const followUser = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const targetUserId = req.params.id;

    if (currentUserId.toString() === targetUserId) {
      return res.status(400).json({ message: "You cannot follow yourself" });
    }

    const me = await User.findById(currentUserId);
    const target = await User.findById(targetUserId);

    if (!me || !target) {
      return res.status(404).json({ message: "User not found" });
    }

    if (me.following.includes(targetUserId)) {
      return res.status(400).json({ message: "Already following this user" });
    }

    // update both sides
    me.following.push(targetUserId);
    target.followers.push(currentUserId);

    await me.save();
    await target.save();

    await HistoryLog.create({
      user: currentUserId,
      taskType: "follow",
      taskId: targetUserId,
      amount: 0,
      metadata: { action: "Followed user", username: target.username },
    });

    // ✅ return updated user with avatars
    const updatedMe = await User.findById(currentUserId)
      .select("-password")
      .populate("followers", "username profilePicture")
      .populate("following", "username profilePicture");

    res.json(updatedMe);
  } catch (err) {
    console.error("Follow user error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= UNFOLLOW USER =================
export const unfollowUser = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const targetUserId = req.params.id;

    const me = await User.findById(currentUserId);
    const target = await User.findById(targetUserId);

    if (!me || !target) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!me.following.includes(targetUserId)) {
      return res.status(400).json({ message: "You are not following this user" });
    }

    me.following = me.following.filter(
      (id) => id.toString() !== targetUserId
    );

    target.followers = target.followers.filter(
      (id) => id.toString() !== currentUserId.toString()
    );

    await me.save();
    await target.save();

    await HistoryLog.create({
      user: currentUserId,
      taskType: "unfollow",
      taskId: targetUserId,
      amount: 0,
      metadata: { action: "Unfollowed user", username: target.username },
    });

    // ✅ return updated user with avatars
    const updatedMe = await User.findById(currentUserId)
      .select("-password")
      .populate("followers", "username profilePicture")
      .populate("following", "username profilePicture");

    res.json(updatedMe);
  } catch (err) {
    console.error("Unfollow user error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= SUGGESTED USERS =================
export const getSuggestedUsers = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    const users = await User.find({
      _id: { $ne: currentUserId },
    })
      .select("username profilePicture followers")
      .limit(10);

    res.json(users);
  } catch (err) {
    console.error("Get suggested users error:", err);
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