// ================= UPDATE PROFILE =================
export const updateProfile = async (req, res) => {
  try {
    const { username, email, country, bio, dob, password, profilePicture } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) return res.status(404).json({ message: "User not found" });

    // Update fields only if provided
    if (username) user.username = username;
    if (email) user.email = email;
    if (country) user.country = country;
    if (bio) user.bio = bio;
    if (dob) user.dob = dob;
    if (profilePicture) user.profilePicture = profilePicture; // ✅ Cloudinary image URL

    // Update password if user wants to change it
    if (password && password.trim() !== "") {
      user.password = password;
    }

    await user.save();

    // Return updated user (without password)
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