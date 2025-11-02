import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import User from "./models/User.js"; // your user model
import connectDB from "./config/db.js";

dotenv.config();
connectDB();

// Telegram Bot setup
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// When a user sends /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    `👋 Hello ${msg.chat.first_name || "User"}!\nWelcome to SocialEarn Bot.\n\nUse /points to check your points or /tasks to view tasks.`
  );
});

// Handle /points command
bot.onText(/\/points/, async (msg) => {
  const chatId = msg.chat.id;

  // You can connect Telegram user to your app account (example only)
  const user = await User.findOne({ telegramId: chatId });
  if (!user) {
    return bot.sendMessage(chatId, "⚠️ You are not linked to a SocialEarn account yet.");
  }

  bot.sendMessage(chatId, `💰 You currently have ${user.points} points!`);
});

// Handle /tasks command
bot.onText(/\/tasks/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "🎯 Visit your tasks here:\nhttps://socialearnfrontend.onrender.com/tasks");
});

export default bot;
