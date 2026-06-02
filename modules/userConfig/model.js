const mongoose = require("mongoose"),
  Schema = mongoose.Schema;
mongoose.Promise = global.Promise;

const { STATUS } = require("./constant");

// permissions maps a resource key (see RESOURCES) to a list of allowed
// actions (see ACTIONS), e.g. { campaign: ["view", "create"], report: ["view"] }
var userConfigSchema = new mongoose.Schema(
  {
    userId: { type: String, unique: true, index: true },
    orgId: String,
    permissions: { type: Schema.Types.Mixed, default: {} },
    status: { type: String, default: STATUS.ACTIVE },
  },
  { timestamps: true }
);
module.exports =
  mongoose.models.userConfigModel ||
  mongoose.model("userConfigModel", userConfigSchema);
