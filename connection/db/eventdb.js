const mongoose = require("mongoose");
require("dotenv").config();

let eventDBConnection = null

async function connectEventDB() {
  let mongoURI = process.env.MONGO_URI_METRICS;

  try {
    eventDBConnection = await mongoose.createConnection(mongoURI, {
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    }).asPromise();
    console.log("Connected to MongoDB URI for clicks: " + mongoURI);
    return eventDBConnection;
  } catch (err) {
    console.log("Connection error:", err);
  }
}

const getEventDB = () => {
    return eventDBConnection;
}

module.exports = {
  connectEventDB,
  getEventDB
}

