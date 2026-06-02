const { string, number } = require("joi");

const mongoose = require("mongoose"),
  Schema = mongoose.Schema;
mongoose.Promise = global.Promise;


var userSchema = new mongoose.Schema(
  {
    name: String,
    mobile: { type: String, unique: false },
    email: { type: String, unique: false },
    secondaryEmails: { type: [String] },
    orgId: String,
    gender: String,
    age: Number,
    type: String,
    status: String,
    isVerified: Boolean,
    address: String,
    password: String
  },
  { timestamps: true }
);
module.exports =
  mongoose.models.userDetailsModel ||
  mongoose.model("userDetailsModel", userSchema);
