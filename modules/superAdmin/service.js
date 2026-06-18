const campaignModel = require("../campaign/model");
const orgModel = require("../organization/model");
const { STATUS: CAMPAIGN_STATUS } = require("../campaign/constant");

const superAdminService = {
  // All campaigns across every org (for the bid-config campaign picker).
  getAllCampaigns: async () => {
    const campaigns = await campaignModel
      .find({ status: { $ne: CAMPAIGN_STATUS.DELETED } })
      .select({ title: 1, orgId: 1, status: 1, type: 1, appOs: 1, eventDetails: 1, enableBidding: 1 })
      .sort({ createdAt: -1 });

    const orgs = await orgModel.find({}).select({ name: 1 });
    const orgName = {};
    orgs.forEach((o) => {
      orgName[String(o._id)] = o.name;
    });

    return {
      data: campaigns.map((c) => ({
        campaignId: String(c._id),
        title: c.title,
        orgId: c.orgId,
        orgName: orgName[String(c.orgId)] || null,
        status: c.status,
        type: c.type,
        appOs: c.appOs,
        enableBidding: !!c.enableBidding,
        eventBidPrice:
          (c.eventDetails && c.eventDetails[0] && c.eventDetails[0].bidPrice) || null,
      })),
    };
  },
};

module.exports = superAdminService;
