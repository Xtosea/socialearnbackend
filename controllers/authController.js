import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { updateUserPoints } from "../utils/pointsHelpers.js";
import { dailyLoginRewardHelper } from "../utils/dailyLoginHelper.js";

// ================= JWT =================
const generateToken = (id, isAdmin = false) =>
  jwt.sign({ id, isAdmin }, process.env.JWT_SECRET, { expiresIn: "30d" });

// ================= REGISTER =================
export const registerUser = async (req, res) => {
  let { username, email, password, country, referralCode } = req.body;

  if (!username || !email || !password || !country) {
    return res.status(400).json({ message: "All fields are required" });
  }

  username = username.trim();
  email = email.trim().toLowerCase();
  password = password.trim();
  country = country.trim();

  try {
    const exists = await User.findOne({
      $or: [
        { email: new RegExp(`^${email}$`, "i") },
        { username: new RegExp(`^${username}$`, "i") },
      ],
    });

    if (exists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const newUser = await User.create({
      username,
      email,
      password,
      country,
      referralCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
    });

    // ================= REFERRAL =================
    if (referralCode) {
      const referrer = await User.findOne({ referralCode });

      if (referrer) {
        newUser.referredBy = referrer._id;
        await newUser.save();

        // ✅ POINTS (correct usage)
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

        // ✅ LINK REFERRAL RELATION
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

// ================= LOGIN =================
export const loginUser = async (req, res) => {
  const { identifier, password, adminOnly } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ message: "Credentials required" });
  }

  try {
    const user = await User.findOne({
      $or: [
        { email: new RegExp(`^${identifier}$`, "i") },
        { username: new RegExp(`^${identifier}$`, "i") },
      ],
    });

    if (!user || !(await user.matchPassword(password))) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (adminOnly && !user.isAdmin) {
      return res.status(403).json({ message: "Admins only" });
    }

    // ✅ DAILY LOGIN ONLY HERE
    const dailyLogin = await dailyLoginRewardHelper(
      user,
      req.app.get("io")
    );

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

// ================= GET CURRENT USER =================
export const getCurrentUser = async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  res.json(user);
};