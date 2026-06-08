const express = require("express");

const router = express.Router();
const { userRoute } = require("./modules/user/index");
const { userConfigRoute } = require("./modules/userConfig/index");
const { mediaRoute } = require("./modules/media/index");
const { campaignRoute } = require("./modules/campaign/index");
const { organizationRoute } = require("./modules/organization/index");
const { aggregateMetricsRoute } = require("./modules/aggregate-metrics/index");
const { reportRoute } = require("./modules/report/index");


router.use("/user", userRoute);
router.use("/user-config", userConfigRoute);
router.use("/media", mediaRoute);
router.use("/campaign", campaignRoute);
router.use("/org", organizationRoute);
router.use("/dashboard", aggregateMetricsRoute);
router.use("/report", reportRoute);

module.exports = router;
