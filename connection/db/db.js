const mongoose = require("mongoose");
require("dotenv").config();

async function connect() {
  let mongoURI = process.env.MONGO_URI;

  try {
    await mongoose.connect(mongoURI, {
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB URI: " + mongoURI);
  } catch (err) {
    console.log("Connection error:", err);
  }
}

module.exports = {
  connect
}

