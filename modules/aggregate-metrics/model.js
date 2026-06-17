const mongoose = require("mongoose"),
    Schema = mongoose.Schema;
mongoose.Promise = global.Promise;


var aggregateMetricsSchema = new mongoose.Schema(
    {
        orgId: String,
        campaignId: String,
        creativeId: String, // which creative served (from the bid-engine CSVs)
        pubId: String, // publisher zone
        country: String, // geo (request device country)
        bidCount: String,
        unitBidPrice: String,
        eventName: String,
        date: String, // YYYY-MM-DD (date-wise aggregation key)
        source: String, // who produced the row, e.g. "engine" (bid-engine roll-up) or "mmp"
        instanceId: String, // which bid-engine instance produced it, e.g. "instance:1"
    },
    { timestamps: true }
);

// Speeds up the dashboard's org + date-range scans and campaign grouping.
aggregateMetricsSchema.index({ orgId: 1, date: 1 });
aggregateMetricsSchema.index({ orgId: 1, campaignId: 1, date: 1 });
// Used by the aggregator's idempotent, per-instance "delete this date's engine
// rows for this instance, then re-insert".
aggregateMetricsSchema.index({ date: 1, source: 1, instanceId: 1 });

module.exports =
    mongoose.models.aggregateMetricsModel ||
    mongoose.model("aggregateMetricsModel", aggregateMetricsSchema);
