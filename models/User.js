import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, minlength: 4 },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    country: { type: String },

    // ✅ Role (user by default, can be set to admin)
    role: { type: String, enum: ["user", "admin"], default: "user" },

    // ✅ Points balance
    points: { type: Number, default: 0, min: 0 },

    // ✅ Profile fields
    bio: { type: String, default: "" },
    dob: { type: String, default: "" },

    // ✅ Social features
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // ✅ Referral system
    referrals: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    referralCode: { type: String, unique: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// ================= PASSWORD =================
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// ================= POINTS =================
userSchema.methods.addPoints = async function (amount) {
  this.points += amount;
  if (this.points < 0) this.points = 0;
  await this.save();
  return this.points;
};

userSchema.methods.deductPoints = async function (amount) {
  this.points -= amount;
  if (this.points < 0) this.points = 0;
  await this.save();
  return this.points;
};

// ================= VIRTUALS =================
userSchema.virtual("followerCount").get(function () {
  return this.followers.length;
});
userSchema.virtual("followingCount").get(function () {
  return this.following.length;
});
userSchema.virtual("referralCount").get(function () {
  return this.referrals.length;
});

const User = mongoose.model("User", userSchema);
export default User;