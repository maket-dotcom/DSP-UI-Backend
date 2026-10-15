const lineItemModel = require("./model");
const campaignModel = require("../campaign/model");
const creativeService = require("../creative/service");
const { STATUS, FORMAT } = require("./constant");
const { isUndefinedOrNull } = require("../../utils/validators");

const isObjectId = (v) => typeof v === "string" && /^[a-fA-F0-9]{24}$/.test(v);
const notDeleted = { $ne: STATUS.DELETED };
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const day = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null);

// The campaign a line item belongs to, scoped to the caller's org.
const loadCampaign = async (campaignId, orgId) => {
  if (!isObjectId(campaignId)) throw new Error("Invalid campaign id");
  const c = await campaignModel.findOne({ _id: campaignId, orgId, status: notDeleted }).lean();
  if (isUndefinedOrNull(c)) throw new Error(`No campaign exists with id: ${campaignId}`);
  if (isUndefinedOrNull(c.advertiserId) || c.advertiserId === "") {
    throw new Error("This campaign has no advertiser yet. Edit the campaign and pick an advertiser first.");
  }
  return c;
};

// A CTV campaign buys video; mobile and web campaigns buy banners.
const formatFor = (campaign) => (campaign.type === "ctv" ? FORMAT.VIDEO : FORMAT.BANNER);

// Every cross-level rule a line item must satisfy against its campaign.
// `li` is the merged line item (existing values + this update).
const validateAgainstCampaign = async ({ li, campaign, selfId, orgId }) => {
  const expected = formatFor(campaign);
  if (li.format !== expected) {
    throw new Error(
      `A ${campaign.type} campaign's line items must be ${expected}; this line item is ${li.format}.`
    );
  }

  // Flight inside the campaign's flight.
  const cStart = day(campaign.startDate);
  const cEnd = day(campaign.endDate);
  const lStart = day(li.startDate);
  const lEnd = day(li.endDate);
  if (lStart && lEnd && lStart > lEnd) throw new Error("Line item end date is before its start date.");
  if (lStart && cStart && lStart < cStart) {
    throw new Error(`Line item can't start before the campaign starts (${cStart}).`);
  }
  if (lEnd && cEnd && lEnd > cEnd) throw new Error(`Line item can't end after the campaign ends (${cEnd}).`);
  if (lStart && cEnd && lStart > cEnd) throw new Error(`Line item can't start after the campaign ends (${cEnd}).`);

  // Budgets inside the campaign's budgets.
  const cBudget = num(campaign.budget);
  const cDaily = num(campaign.dailyBudget);
  const unit = campaign.budgetType === "impressions" ? " impressions" : "";
  if (li.dailyBudget > 0 && cDaily > 0 && li.dailyBudget > cDaily) {
    throw new Error(`Line item daily budget can't exceed the campaign's daily budget (${cDaily}${unit}).`);
  }
  if (li.budget > 0 && cBudget > 0) {
    const others = await lineItemModel.aggregate([
      {
        $match: {
          orgId,
          campaignId: String(campaign._id),
          status: notDeleted,
          ...(selfId ? { _id: { $ne: selfId } } : {}),
        },
      },
      { $group: { _id: null, sum: { $sum: { $ifNull: ["$budget", 0] } } } },
    ]);
    const used = (others[0] && others[0].sum) || 0;
    if (used + li.budget > cBudget) {
      throw new Error(
        `Line item budgets would total ${used + li.budget}${unit}, more than the campaign budget (${cBudget}${unit}). ` +
          `${Math.max(0, cBudget - used)}${unit} is left.`
      );
    }
  }

  // Creatives: same advertiser, matching the format.
  const ids = (li.creatives || []).map((c) => c.creativeId);
  const rows = await creativeService.assertBelongTo({ ids, advertiserId: campaign.advertiserId, orgId });
  const wrong = rows.filter((r) => (li.format === FORMAT.VIDEO) !== (r.type === "video"));
  if (wrong.length) {
    throw new Error(
      `${wrong.length} attached creative(s) don't match a ${li.format} line item ` +
        `(${li.format === FORMAT.VIDEO ? "attach video creatives" : "attach image creatives"}).`
    );
  }
};

// The engine only bids with active line items that have creatives.
const assertCanActivate = (li) => {
  if (li.status === STATUS.ACTIVE && !(li.creatives || []).length) {
    throw new Error("Attach at least one creative before activating this line item.");
  }
};

const lineItemService = {
  list: async ({ data, reqBy }) => {
    await loadCampaign(data.campaignId, reqBy.org_id);
    const query = { orgId: reqBy.org_id, campaignId: data.campaignId, status: data.status || notDeleted };
    const rows = await lineItemModel.find(query).sort({ createdAt: 1 });
    return { data: rows };
  },

  getById: async ({ id, reqBy }) => {
    if (!isObjectId(id)) throw new Error("Invalid line item id");
    const li = await lineItemModel.findOne({ _id: id, orgId: reqBy.org_id, status: notDeleted });
    if (isUndefinedOrNull(li)) throw new Error(`No line item exists with id: ${id}`);
    return { data: li };
  },

  create: async ({ data, reqBy }) => {
    const campaign = await loadCampaign(data.campaignId, reqBy.org_id);
    const li = { ...data };
    if (li.bidding.strategy !== "fixed_cpm") li.bidding.cpm = null;
    await validateAgainstCampaign({ li, campaign, selfId: null, orgId: reqBy.org_id });
    assertCanActivate(li);

    const saved = await new lineItemModel({
      ...li,
      orgId: reqBy.org_id,
      advertiserId: campaign.advertiserId,
      createdBy: reqBy.user_id || null,
      updatedBy: reqBy.user_id || null,
    }).save();
    return { message: "Line item created successfully", data: saved };
  },

  update: async ({ id, data, reqBy }) => {
    if (!isObjectId(id)) throw new Error("Invalid line item id");
    const existing = await lineItemModel.findOne({ _id: id, orgId: reqBy.org_id, status: notDeleted }).lean();
    if (isUndefinedOrNull(existing)) throw new Error(`No line item exists with id: ${id}`);
    const campaign = await loadCampaign(existing.campaignId, reqBy.org_id);

    const patch = { ...data };
    if (patch.bidding && patch.bidding.strategy !== "fixed_cpm") patch.bidding.cpm = null;
    const merged = { ...existing, ...patch };
    await validateAgainstCampaign({ li: merged, campaign, selfId: existing._id, orgId: reqBy.org_id });
    assertCanActivate(merged);

    const updated = await lineItemModel.findOneAndUpdate(
      { _id: id, orgId: reqBy.org_id, status: notDeleted },
      { $set: { ...patch, updatedBy: reqBy.user_id || null } },
      { new: true }
    );
    return { message: "Line item updated successfully", data: updated };
  },

  changeStatus: async ({ id, status, reqBy }) => {
    if (!isObjectId(id)) throw new Error("Invalid line item id");
    const existing = await lineItemModel.findOne({ _id: id, orgId: reqBy.org_id, status: notDeleted }).lean();
    if (isUndefinedOrNull(existing)) throw new Error(`No line item exists with id: ${id}`);
    assertCanActivate({ ...existing, status });
    await lineItemModel.updateOne({ _id: id }, { $set: { status, updatedBy: reqBy.user_id || null } });
    return { message: `Line item ${status}.`, data: { id, status } };
  },

  remove: async ({ id, reqBy }) => {
    if (!isObjectId(id)) throw new Error("Invalid line item id");
    const updated = await lineItemModel.findOneAndUpdate(
      { _id: id, orgId: reqBy.org_id, status: notDeleted },
      { $set: { status: STATUS.DELETED, updatedBy: reqBy.user_id || null } },
      { new: true }
    );
    if (isUndefinedOrNull(updated)) throw new Error(`No line item exists with id: ${id}`);
    return { message: "Line item deleted successfully", data: { id: updated._id } };
  },

  // Line item counts per campaign, for the campaign list.
  countsByCampaign: async ({ orgId, campaignIds }) => {
    if (!campaignIds.length) return {};
    const rows = await lineItemModel.aggregate([
      { $match: { orgId, campaignId: { $in: campaignIds }, status: notDeleted } },
      {
        $group: {
          _id: "$campaignId",
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } },
        },
      },
    ]);
    return Object.fromEntries(rows.map((r) => [r._id, { total: r.total, active: r.active }]));
  },
};

module.exports = lineItemService;
