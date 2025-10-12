import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js"; // adjust path if needed

dotenv.config();

async function listUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const users = await User.find();
    console.log("=== Users in Database ===");
    users.forEach(u => {
      console.log({
        username: u.username,
        email: u.email,
        password: u.password, // hashed or plain
        country: u.country,
        points: u.points,
      });
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error listing users:", err);
    process.exit(1);
  }
}

listUsers();