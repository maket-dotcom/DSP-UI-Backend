const express = require("express");

const router = express.Router();
const { userRoute } = require("./modules/user/index");
const { userConfigRoute } = require("./modules/userConfig/index");
const { mediaRoute } = require("./modules/media/index");
const { campaignRoute } = require("./modules/campaign/index");
const { advertiserRoute } = require("./modules/advertiser/index");
const { lineItemRoute } = require("./modules/lineItem/index");
const { creativeRoute } = require("./modules/creative/index");
const { organizationRoute } = require("./modules/organization/index");
const { aggregateMetricsRoute } = require("./modules/aggregate-metrics/index");
const { reportRoute } = require("./modules/report/index");
const { bidConfigRoute } = require("./modules/bidConfig/index");
const { demandRoute } = require("./modules/demand/index");
const { supplyRoute } = require("./modules/supply/index");
const { superAdminRoute } = require("./modules/superAdmin/index");
const { mcpPublisherRoute, mcpReviewRoute } = require("./modules/mcpPublisher/index");


router.use("/user", userRoute);
router.use("/user-config", userConfigRoute);
router.use("/media", mediaRoute);
router.use("/campaign", campaignRoute);
router.use("/advertiser", advertiserRoute);
router.use("/line-item", lineItemRoute);
router.use("/creative", creativeRoute);
router.use("/org", organizationRoute);
router.use("/dashboard", aggregateMetricsRoute);
router.use("/report", reportRoute);
router.use("/bid-config", bidConfigRoute);
router.use("/demand", demandRoute);
router.use("/supply", supplyRoute);
router.use("/super-admin", superAdminRoute);
router.use("/mcp-publisher", mcpPublisherRoute);
router.use("/mcp-review", mcpReviewRoute);

module.exports = router;
