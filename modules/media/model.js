const mongoose = require("mongoose"),
  Schema = mongoose.Schema;
mongoose.Promise = global.Promise;

var mediaSchema = new mongoose.Schema(
  {
    orgId: String,
    brandId: String,
    name: String,
    link1: String,
    link2: String,
    mappingId: String,
    gcsPath: String,
    productId: String,
    status: String,
    fileType: String,
    type: String
  },
  { timestamps: true }
);
module.exports =
  mongoose.models.mediaModel ||
  mongoose.model("mediaModel", mediaSchema);
