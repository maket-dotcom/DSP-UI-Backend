const mongoose = require("mongoose"),
    Schema = mongoose.Schema;
mongoose.Promise = global.Promise;


var reportSchema = new mongoose.Schema(
    {
        orgId: String,
        campaignId: String,
        pubId: String,
        eventName: String,
        country: String,
        region: String,
        city: String,
        // Per-event cost; summed to produce the "Spent" metric.
        price: Number,
    },
    { timestamps: true }
);

// Speeds up the report's org + date-range scans and campaign grouping.
reportSchema.index({ orgId: 1 });
reportSchema.index({ orgId: 1, campaignId: 1 });
reportSchema.index({ orgId: 1, createdAt: 1 });

module.exports =
    mongoose.models.reportModel ||
    mongoose.model("reportModel", reportSchema);
