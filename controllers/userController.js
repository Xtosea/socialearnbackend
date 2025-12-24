import User from "../models/User.js";
import HistoryLog from "../models/HistoryLog.js";
import generateToken from "../utils/generateToken.js";
import { nanoid } from "nanoid"; // for referral codes

// ================= REGISTER USER =================
export const registerUser = async (req, res) => {
  try {
    const { username, email, password, country, referralCode } = req.body;

    // ------------------- VALIDATION -------------------
    if (!username || username.trim().length < 4) {
      return res
        .status(400)
        .json({ message: "Username must be at least 4 characters" });
    }
    if (!email || !password || !country || country.trim() === "") {
      return res.status(400).json({ message: "All required fields must be filled" });
    }

    // ------------------- CHECK EXISTING USER -------------------
    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) return res.status(400).json({ message: "User already exists" });

    // ------------------- REFERRAL LOGIC -------------------
    let referrer = null;
    if (referralCode && referralCode.trim() !== "") {
      referrer = await User.findOne({ referralCode: referralCode.trim() });
      if (!referrer) return res.status(400).json({ message: "Invalid referral code" });
      if (referrer.email === email) return res.status(400).json({ message: "You cannot refer yourself" });
    }

    // ------------------- CREATE USER -------------------
    const newReferralCode = nanoid(8); // auto-generate unique code
    const userData = {
      username,
      email,
      password,
      country,
      referralCode: newReferralCode,
      referredBy: referrer ? referrer._id : null,
    };

    const user = await User.create(userData);

    // ------------------- SAVE REFERRAL RELATION & REWARD -------------------
    if (referrer) {
      referrer.referrals.push(user._id);
      referrer.points += 1500; // reward referrer
      await referrer.save();

      // Log referral reward
      await HistoryLog.create({
        user: referrer._id,
        taskType: "referral",
        taskId: user._id,
        amount: 1500,
        metadata: { action: "Referral reward", referredUsername: user.username },
      });
    }

    // ------------------- RESPONSE -------------------
    res.status(201).json({
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        country: user.country,
        points: user.points,
        referralCode: user.referralCode,
      },
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ================= LOGIN USER =================
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    console.error("Login error:", error);
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
    const {
      username,
      email,
      country,
      bio,
      dob,
      password,
      profilePicture,
    } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (username) user.username = username;
    if (email) user.email = email;
    if (country) user.country = country;
    if (bio) user.bio = bio;
    if (dob) user.dob = dob;
    if (profilePicture) user.profilePicture = profilePicture;

    if (password && password.trim() !== "") {
      user.password = password;
    }

    await user.save();

    const updatedUser = await User.findById(user._id).select("-password");

    res.json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= FOLLOW USER =================
export const followUser = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id;

    if (id === currentUserId.toString()) {
      return res.status(400).json({ message: "You cannot follow yourself" });
    }

    const userToFollow = await User.findById(id);
    const currentUser = await User.findById(currentUserId);

    if (!userToFollow || !currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (userToFollow.followers.includes(currentUserId)) {
      return res.status(400).json({ message: "Already following this user" });
    }

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

    if (!userToUnfollow || !currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!userToUnfollow.followers.includes(currentUserId)) {
      return res
        .status(400)
        .json({ message: "You are not following this user" });
    }

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