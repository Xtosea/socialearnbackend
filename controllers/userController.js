// controllers/userController.js
import User from "../models/User.js";
import HistoryLog from "../models/HistoryLog.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { updateUserPoints } from "../utils/pointsHelpers.js";
import { dailyLoginRewardHelper } from "../utils/dailyLoginHelper.js"; // daily login helper

// Generate JWT token
const generateToken = (id, isAdmin = false) =>
  jwt.sign({ id, isAdmin }, process.env.JWT_SECRET, { expiresIn: "30d" });

// ================= LOGIN USER =================
export const loginUser = async (req, res) => {
  const { identifier, password, adminOnly } = req.body;

  if (!identifier || !password)
    return res.status(400).json({ message: "Email/Username and password required" });

  try {
    const user = await User.findOne({
      $or: [
        { email: new RegExp(`^${identifier}$`, "i") },
        { username: new RegExp(`^${identifier}$`, "i") },
      ],
    });

    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const match = await user.matchPassword(password);
    if (!match) return res.status(400).json({ message: "Invalid credentials" });

    if (adminOnly && !user.isAdmin) {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    // ===== AUTOMATIC DAILY LOGIN =====
    let dailyLoginInfo = {};
    try {
      dailyLoginInfo = await dailyLoginRewardHelper(user, req);
    } catch (err) {
      console.error("Daily login reward error:", err.message);
    }

    // ===== LOGIN RESPONSE =====
    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      country: user.country,
      points: user.points,
      referralCode: user.referralCode,
      bio: user.bio,
      dob: user.dob,
      isAdmin: user.isAdmin,
      token: generateToken(user._id, user.isAdmin),
      dailyLogin: dailyLoginInfo, // daily login info
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= GET PROFILE =================
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

// ================= UPDATE PROFILE =================
export const updateProfile = async (req, res) => {
  try {
    const { username, email, country, bio, dob, password } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) return res.status(404).json({ message: "User not found" });

    if (username) user.username = username.trim();
    if (email) user.email = email.trim().toLowerCase();
    if (country) user.country = country.trim();
    if (bio !== undefined) user.bio = bio.trim();
    if (dob !== undefined) user.dob = dob;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    await user.save();

    res.json({ message: "Profile updated successfully", user });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= FOLLOW USER =================
export const followUser = async (req, res) => {
  try {
    const { id } = req.params; // user to follow
    const currentUserId = req.user._id;

    if (id === currentUserId.toString())
      return res.status(400).json({ message: "You cannot follow yourself" });

    const userToFollow = await User.findById(id);
    const currentUser = await User.findById(currentUserId);

    if (!userToFollow || !currentUser)
      return res.status(404).json({ message: "User not found" });

    if (userToFollow.followers.includes(currentUserId))
      return res.status(400).json({ message: "Already following this user" });

    userToFollow.followers.push(currentUserId);
    currentUser.following.push(userToFollow._id);

    await userToFollow.save();
    await currentUser.save();

    await HistoryLog.create({
      user: currentUserId,
      taskType: "follow",
      taskId: id,
      amount: 0,
      metadata: { action: "Followed user", username: userToFollow.username },
    });

    res.json({ message: `You are now following ${userToFollow.username}` });
  } catch (err) {
    console.error("Follow user error:", err);
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

    if (!userToUnfollow || !currentUser)
      return res.status(404).json({ message: "User not found" });

    if (!userToUnfollow.followers.includes(currentUserId))
      return res.status(400).json({ message: "You are not following this user" });

    userToUnfollow.followers = userToUnfollow.followers.filter(
      (uid) => uid.toString() !== currentUserId.toString()
    );
    currentUser.following = currentUser.following.filter(
      (uid) => uid.toString() !== id.toString()
    );

    await userToUnfollow.save();
    await currentUser.save();

    await HistoryLog.create({
      user: currentUserId,
      taskType: "unfollow",
      taskId: id,
      amount: 0,
      metadata: { action: "Unfollowed user", username: userToUnfollow.username },
    });

    res.json({ message: `You unfollowed ${userToUnfollow.username}` });
  } catch (err) {
    console.error("Unfollow user error:", err);
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