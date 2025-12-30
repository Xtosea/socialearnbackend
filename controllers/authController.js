import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { updateUserPoints } from "../utils/pointsHelpers.js";
import { dailyLoginRewardHelper } from "../utils/dailyLoginHelper.js";

// JWT token
const generateToken = (id, isAdmin = false) =>
  jwt.sign({ id, isAdmin }, process.env.JWT_SECRET, { expiresIn: "30d" });

// REGISTER
export const registerUser = async (req, res) => {
  const { username, email, password, country, referralCode } = req.body;

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

    const newUser = await User.create({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password: password.trim(),
      country: country.trim(),
      referralCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
    });

    // Referral bonus
    if (referralCode) {
      const referrer = await User.findOne({ referralCode });
      if (referrer) {
        newUser.referredBy = referrer._id;
        await newUser.save();

        await updateUserPoints({
          user: newUser,
          amount: 1500,
          taskType: "referral-bonus",
          description: "Referral signup bonus",
          io: req.app.get("io"),
        });

        await updateUserPoints({
          user: referrer,
          amount: 1500,
          taskType: "referral-bonus",
          description: `Referral bonus for ${newUser.username}`,
          io: req.app.get("io"),
        });

        referrer.referrals.push(newUser._id);
        await referrer.save();
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

    const dailyLogin = await dailyLoginRewardHelper(user, req.app.get("io"));

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
      dailyLogin,
      token: generateToken(user._id, user.isAdmin),
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET CURRENT USER (/me)
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("Get current user error:", err);
    res.status(500).json({ message: "Server error" });
  }
};