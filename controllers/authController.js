import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

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

    // ================= Referral Bonus Logic =================
    if (referralCode) {
      const referrer = await User.findOne({ referralCode });
      if (referrer) {
        // 🎄 Xmas Bonus: 1500 points from Dec 24 to Dec 26
        const now = new Date();
        const month = now.getMonth(); // 0 = Jan, 11 = Dec
        const date = now.getDate();

        const isXmasBonanza = month === 11 && date >= 24 && date <= 26;
        const bonusPoints = isXmasBonanza ? 1500 : 300;

        newUser.points += bonusPoints;       // New user bonus
        newUser.referredBy = referrer._id;
        referrer.points += bonusPoints;      // Referrer bonus
        referrer.referrals.push(newUser._id);
        await referrer.save();
      }
    }

    await newUser.save();

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