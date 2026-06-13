const express = require("express");

const router = express.Router();
const { userRoute } = require("./modules/user/index");
const { userConfigRoute } = require("./modules/userConfig/index");
const { mediaRoute } = require("./modules/media/index");
const { campaignRoute } = require("./modules/campaign/index");
const { organizationRoute } = require("./modules/organization/index");
const { aggregateMetricsRoute } = require("./modules/aggregate-metrics/index");
const { reportRoute } = require("./modules/report/index");
const { bidConfigRoute } = require("./modules/bidConfig/index");
const { superAdminRoute } = require("./modules/superAdmin/index");


router.use("/user", userRoute);
router.use("/user-config", userConfigRoute);
router.use("/media", mediaRoute);
router.use("/campaign", campaignRoute);
router.use("/org", organizationRoute);
router.use("/dashboard", aggregateMetricsRoute);
router.use("/report", reportRoute);
router.use("/bid-config", bidConfigRoute);
router.use("/super-admin", superAdminRoute);

module.exports = router;
