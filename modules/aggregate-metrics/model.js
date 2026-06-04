const mongoose = require("mongoose"),
    Schema = mongoose.Schema;
mongoose.Promise = global.Promise;


var aggregateMetricsSchema = new mongoose.Schema(
    {
        orgId: String,
        campaignId: String,
        bidCount: String,
        unitBidPrice: String,
        eventName: String,
        date: String, // YYYY-MM-DD (date-wise aggregation key)
    },
    { timestamps: true }
);

// Speeds up the dashboard's org + date-range scans and campaign grouping.
aggregateMetricsSchema.index({ orgId: 1, date: 1 });
aggregateMetricsSchema.index({ orgId: 1, campaignId: 1, date: 1 });

module.exports =
    mongoose.models.aggregateMetricsModel ||
    mongoose.model("aggregateMetricsModel", aggregateMetricsSchema);
