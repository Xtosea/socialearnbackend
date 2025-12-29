// controllers/authController.js
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { updateUserPoints } from "../utils/pointsHelpers.js";

// ================= GENERATE TOKEN =================
const generateToken = (id, isAdmin = false) =>
  jwt.sign({ id, isAdmin }, process.env.JWT_SECRET, { expiresIn: "30d" });

// ================= REGISTER USER =================
export const registerUser = async (req, res) => {
  let { username, email, password, country, referralCode } = req.body;
  username = username?.trim();
  email = email?.trim().toLowerCase();
  password = password?.trim();
  country = country?.trim();

  if (!username || !email || !password || !country)
    return res.status(400).json({ message: "All fields are required" });

  try {
    const exists = await User.findOne({
      $or: [
        { email: new RegExp(`^${email}$`, "i") },
        { username: new RegExp(`^${username}$`, "i") },
      ],
    });
    if (exists) return res.status(400).json({ message: "User already exists" });

    const newUser = new User({ username, email, password, country });
    newUser.referralCode = newUser._id.toString().slice(-6);

    // Handle referral points
    if (referralCode) {
      const referrer = await User.findOne({ referralCode });
      if (referrer) {
        // Give points to new user
        await updateUserPoints({
          user: newUser,
          amount: 1500,
          taskType: "referral-bonus",
          description: `Referral bonus for using code ${referralCode}`,
          metadata: { referrerId: referrer._id },
        });

        // Give points to referrer
        await updateUserPoints({
          user: referrer,
          amount: 1500,
          taskType: "referral-bonus",
          description: `Referral bonus for referring ${newUser.username}`,
          metadata: { referredUserId: newUser._id },
        });

        newUser.referredBy = referrer._id;
        referrer.referrals.push(newUser._id);
        await referrer.save();
      }
    }

    await newUser.save();

    // Emit socket updates if Socket.IO is connected
    const io = req.app.get("io");
    if (io) {
      io.to(newUser._id.toString()).emit("pointsUpdate", { points: newUser.points });
      if (newUser.referredBy) {
        io.to(newUser.referredBy.toString()).emit("pointsUpdate", { points: newUser.points });
      }
    }

    res.status(201).json({
      _id: newUser._id,
      username: newUser.username,
      email: newUser.email,
      country: newUser.country,
      points: newUser.points,
      referralCode: newUser.referralCode,
      token: generateToken(newUser._id, newUser.isAdmin),
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= LOGIN USER =================
export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email: new RegExp(`^${email}$`, "i") });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      country: user.country,
      points: user.points,
      referralCode: user.referralCode,
      token: generateToken(user._id, user.isAdmin),
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= GET CURRENT USER =================
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password")
      .populate("followers following referrals", "username _id");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (err) {
    console.error("Get current user error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= UPDATE PROFILE =================
export const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { username, bio, dob, profilePicture, country } = req.body;
    if (username) user.username = username;
    if (bio) user.bio = bio;
    if (dob) user.dob = dob;
    if (profilePicture) user.profilePicture = profilePicture;
    if (country) user.country = country;

    await user.save();
    res.json(user);
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= DAILY LOGIN REWARD =================
export const claimDailyLogin = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const today = new Date().toDateString();
    const lastLogin = user.dailyLogin?.lastLoginDate?.toDateString();

    if (lastLogin === today) {
      return res.json({ message: "Already claimed today", earnedToday: 0 });
    }

    const pointsEarned = 100; // Daily login points
    user.dailyLogin.lastLoginDate = new Date();
    user.dailyLogin.monthlyEarned += pointsEarned;
    user.points += pointsEarned;

    await user.save();

    // Emit Socket.IO update
    const io = req.app.get("io");
    if (io) io.to(user._id.toString()).emit("pointsUpdate", { points: user.points });

    res.json({ message: "Daily login claimed", earnedToday: pointsEarned, newPoints: user.points });
  } catch (err) {
    console.error("Daily login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};