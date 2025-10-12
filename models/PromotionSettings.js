// models/PromotionSettings.js
import mongoose from "mongoose";

const promotionSettingsSchema = new mongoose.Schema({
  globalCost: { type: Number, default: 50 }, // fallback cost for any task

  platformCosts: {
    youtube: { type: Number, default: 50 },
    tiktok: { type: Number, default: 50 },
    facebook: { type: Number, default: 50 },
    instagram: { type: Number, default: 50 },
    twitter: { type: Number, default: 50 },
  },

  actionCosts: {
    like: { type: Number, default: 20 },
    share: { type: Number, default: 20 },
    comment: { type: Number, default: 20 },
    follow: { type: Number, default: 20 },
  },
});

const PromotionSettings = mongoose.model("PromotionSettings", promotionSettingsSchema);
export default PromotionSettings;