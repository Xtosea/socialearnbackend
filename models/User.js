import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    // ===== BASIC INFO =====
    username: {
      type: String,
      required: true,
      unique: true,
      minlength: 4,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      required: true,
    },

    country: {
      type: String,
    },

    // ===== EMAIL VERIFICATION =====
    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    emailVerificationToken: {
      type: String,
    },

    // ===== ROLE =====
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    // ===== PROFILE =====
    bio: {
      type: String,
      default: "",
    },

    dob: {
      type: String,
      default: "",
    },

    profilePicture: {
      type: String,
      default: "",
    },

    // ===== POINTS =====
    points: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ===== SOCIAL =====
    followers: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ],

    following: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ],

    // ===== REFERRALS =====
    referrals: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ],

    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    referralCode: {
      type: String,
      unique: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ================= PASSWORD =================
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
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

// ================= FOLLOW SYSTEM =================
userSchema.methods.follow = async function (targetUser) {
  if (!this.following.includes(targetUser._id)) {
    this.following.push(targetUser._id);
    targetUser.followers.push(this._id);
    await this.save();
    await targetUser.save();
  }
  return {
    following: this.following,
    followers: targetUser.followers,
  };
};

userSchema.methods.unfollow = async function (targetUser) {
  this.following = this.following.filter(
    (id) => id.toString() !== targetUser._id.toString()
  );

  targetUser.followers = targetUser.followers.filter(
    (id) => id.toString() !== this._id.toString()
  );

  await this.save();
  await targetUser.save();

  return {
    following: this.following,
    followers: targetUser.followers,
  };
};

// ================= VIRTUALS =================
userSchema.virtual("followerCount").get(function () {
  return this.followers?.length || 0;
});

userSchema.virtual("followingCount").get(function () {
  return this.following?.length || 0;
});

userSchema.virtual("referralCount").get(function () {
  return this.referrals?.length || 0;
});

const User = mongoose.model("User", userSchema);
export default User;