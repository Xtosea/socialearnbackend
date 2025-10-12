import mongoose from "mongoose";

const AdminWalletSchema = new mongoose.Schema({
  points: { type: Number, default: 0 },
});

export default mongoose.model("AdminWallet", AdminWalletSchema);