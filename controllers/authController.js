import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { updateUserPoints } from "../utils/pointsHelpers.js"; // Make sure you have this helper

// Generate JWT token
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

    const newUser = new User({ username, email, password, country, points: 0 });
    newUser.referralCode = newUser._id.toString().slice(-6);

    // Handle referral code
    if (referralCode) {
      const referrer = await User.findOne({ referralCode });
      if (referrer) {
        // Give points to new user
        await updateUserPoints({
          user: newUser,
          amount: 1500,
          taskType: "referral-bonus",
          taskId: null,
          description: `Referral bonus for using code ${referralCode}`,
          metadata: { referrerId: referrer._id },
        });

        // Give points to referrer
        await updateUserPoints({
          user: referrer,
          amount: 1500,
          taskType: "referral-bonus",
          taskId: null,
          description: `Referral bonus for referring ${newUser.username}`,
          metadata: { referredUserId: newUser._id },
        });

        newUser.referredBy = referrer._id;
        referrer.referrals.push(newUser._id);
        await referrer.save();
      }
    }

    await newUser.save();

    // Optionally emit points update if using Socket.IO
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