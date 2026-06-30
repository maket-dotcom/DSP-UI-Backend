const axios = require("axios");
const campaignModel = require("../campaign/model");
const orgModel = require("../organization/model");
const { STATUS: CAMPAIGN_STATUS } = require("../campaign/constant");

require("dotenv").config();

// The DSP bid engine exposes live Redis-backed counters at GET /counts.
// Override via env in case the tracking domain changes.
const ENGINE_COUNTS_URL =
  process.env.BID_ENGINE_COUNTS_URL || "http://track.adsshare.in/counts";

const superAdminService = {
  // Proxy the bid engine's real-time counters (total + today) for the
  // super-admin live dashboard. Never throws: if the engine is unreachable the
  // dashboard should keep working, so we return empty buckets + an `unavailable`
  // flag instead of failing the request.
  getEngineCounts: async () => {
    try {
      const { data } = await axios.get(ENGINE_COUNTS_URL, {
        timeout: 5000,
        headers: { accept: "application/json" },
      });
      return {
        total: data?.total || {},
        today: data?.today || {},
        unavailable: false,
        fetchedAt: new Date().toISOString(),
      };
    } catch (err) {
      return {
        total: {},
        today: {},
        unavailable: true,
        error: err.message,
        fetchedAt: new Date().toISOString(),
      };
    }
  },

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
