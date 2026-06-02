const mongoose = require("mongoose"),
  Schema = mongoose.Schema;
mongoose.Promise = global.Promise;

var orgSchema = new mongoose.Schema(
  {
    name: String,
    type: String,
    adminId: String,
    subdomain: String,
    domain: String,
    timezone: String,
    orgConfig: {
      logoUrl: { type: String, default: null },
      logoUrlId: { type: String, default: null },
      themeColor: { type: String, default: null },
    },
    accessConfig: {
      crm: { type: Boolean, default: true },
      tracking: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);
module.exports =
  mongoose.models.orgModel ||
  mongoose.model("orgModel", orgSchema);
