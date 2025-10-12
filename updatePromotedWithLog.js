// updatePromotedWithLog.js
import mongoose from "mongoose";
import Task from "./models/Task.js"; // adjust path if needed
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/yourdbname";

const updatePromotedTasks = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("Connected to MongoDB");

    // Find tasks that are currently promoted: false
    const tasksToUpdate = await Task.find({ promoted: false }).select("_id url");

    if (tasksToUpdate.length === 0) {
      console.log("No tasks needed updating.");
    } else {
      console.log(`Updating ${tasksToUpdate.length} task(s):`);
      tasksToUpdate.forEach((task) =>
        console.log(`- ${task._id} | ${task.url}`)
      );

      // Update them
      await Task.updateMany(
        { promoted: false },
        { $set: { promoted: true } }
      );

      console.log("Update complete!");
    }

    mongoose.disconnect();
  } catch (err) {
    console.error("Error updating tasks:", err);
    mongoose.disconnect();
  }
};

updatePromotedTasks();