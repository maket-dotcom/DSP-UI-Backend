const { STATUS, KIND, DECISION, MINOR_FIELDS } = require("./constant");
const { NETWORK_TYPES } = require("../user/constant");
const { isUndefinedOrNull } = require("../../utils/validators");

// Lazily required: the campaign / line item / creative services require this one.
const networkModel = () => require("../network/model");
const advertiserModel = () => require("../advertiser/model");
const MODEL = {
  [KIND.CAMPAIGN]: () => require("../campaign/model"),
  [KIND.LINE_ITEM]: () => require("../lineItem/model"),
  [KIND.CREATIVE]: () => require("../creative/model"),
};
const LABEL = { [KIND.CAMPAIGN]: "campaign", [KIND.LINE_ITEM]: "line item", [KIND.CREATIVE]: "creative" };

const notDeleted = { $ne: "deleted" };

// Approval is about who really made the change: a network user. An org
// user's work is approved straight away, even inside a network.
const isNetworkUser = (reqBy) => NETWORK_TYPES.includes(reqBy.type);

// The caller's records: one network's when the caller works in a network
// (a network user, or an org user who entered one), else the whole org.
const scopeOf = (reqBy) =>
  isUndefinedOrNull(reqBy.network_id)
    ? { orgId: reqBy.org_id }
    : { orgId: reqBy.org_id, networkId: reqBy.network_id };

// A network's work waits for the org unless the org switched approval off.
const requiresApproval = async (networkId) => {
  if (isUndefinedOrNull(networkId) || networkId === "") return false;
  const network = await networkModel().findOne({ _id: networkId }).select({ requireApproval: 1 }).lean();
  return !!network && network.requireApproval !== false;
};

const approved = (reqBy, now) => ({
  status: STATUS.APPROVED,
  submittedBy: reqBy.user_id || null,
  submittedAt: now,
  reviewedBy: null, // nobody had to review it
  reviewedAt: now,
  note: null,
  changes: [],
});

const pending = (reqBy, now, changes) => ({
  status: STATUS.PENDING,
  submittedBy: reqBy.user_id || null,
  submittedAt: now,
  reviewedBy: null,
  reviewedAt: null,
  note: null,
  changes,
});

// Whether an edit really changes a stored value. Forms send whole objects,
// so only the fields the edit carries are compared, and empty values
// (null, "", [], missing) count as equal.
const isEmpty = (v) => v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
const leaf = (v) => {
  if (v instanceof Date) return v.toISOString();
  if (v && typeof v === "object" && typeof v.toHexString === "function") return v.toHexString();
  if (typeof v === "number" || (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v)))) return Number(v);
  return v;
};
const differs = (next, prev) => {
  if (isEmpty(next) && isEmpty(prev)) return false;
  if (Array.isArray(next)) {
    if (!Array.isArray(prev) || prev.length !== next.length) return true;
    return next.some((v, i) => differs(v, prev[i]));
  }
  if (next && typeof next === "object" && !(next instanceof Date)) {
    return Object.keys(next).some((k) => differs(next[k], prev ? prev[k] : undefined));
  }
  return leaf(next) !== leaf(prev);
};

const summary = (doc) => (doc ? { id: String(doc._id), approval: doc.approval || null } : null);

const approvalService = {
  STATUS,

  // The approval a new campaign / line item / creative starts with.
  initial: async ({ reqBy, networkId }) => {
    const now = new Date();
    if (isNetworkUser(reqBy) && (await requiresApproval(networkId))) return pending(reqBy, now, []);
    return approved(reqBy, now);
  },

  // Extra fields for an update: a network user's material change sends the
  // item back to the org (and resubmits a rejected one). Returns {} when the
  // approval stays as it is.
  afterEdit: async ({ reqBy, kind, existing, patch, networkId }) => {
    if (!isNetworkUser(reqBy)) return {};
    const changed = Object.keys(patch).filter(
      (k) => !MINOR_FIELDS[kind].includes(k) && differs(patch[k], existing[k])
    );
    if (!changed.length) return {};
    const now = new Date();
    if (!(await requiresApproval(networkId))) {
      return existing.approval?.status && existing.approval.status !== STATUS.APPROVED ? { approval: approved(reqBy, now) } : {};
    }
    const before = existing.approval?.status === STATUS.PENDING ? existing.approval.changes || [] : [];
    return { approval: pending(reqBy, now, [...new Set([...before, ...changed])]) };
  },

  // Items waiting for (or given) a decision, grouped by campaign. Creatives
  // sit under every campaign whose line items use them; unused ones under
  // their advertiser.
  queue: async ({ data, reqBy }) => {
    const scope = scopeOf(reqBy);
    const match = { ...scope, status: notDeleted, "approval.status": data.status };
    const [camps, lis, crs] = await Promise.all([
      MODEL.campaign().find(match).select({ title: 1, type: 1, status: 1, advertiserId: 1, networkId: 1, approval: 1, budget: 1, dailyBudget: 1 }).lean(),
      MODEL.lineItem().find(match).select({ name: 1, format: 1, status: 1, campaignId: 1, approval: 1, budget: 1, bidding: 1 }).lean(),
      MODEL.creative().find(match).select({ name: 1, type: 1, link: 1, vastTag: 1, w: 1, h: 1, advertiserId: 1, networkId: 1, approval: 1, clickUrl: 1 }).lean(),
    ]);

    // Which campaigns use each creative.
    const crIds = crs.map((c) => String(c._id));
    const users = crIds.length
      ? await MODEL.lineItem()
          .find({ ...scope, status: notDeleted, "creatives.creativeId": { $in: crIds } })
          .select({ campaignId: 1, creatives: 1 })
          .lean()
      : [];
    const campaignsOf = {};
    users.forEach((li) =>
      (li.creatives || []).forEach((c) => {
        if (crIds.includes(c.creativeId)) {
          campaignsOf[c.creativeId] = [...new Set([...(campaignsOf[c.creativeId] || []), li.campaignId])];
        }
      })
    );

    const groups = {};
    const group = (key) => (groups[key] = groups[key] || { key, campaign: null, advertiser: null, network: null, lineItems: [], creatives: [] });
    camps.forEach((c) => (group(String(c._id)).campaignDoc = c));
    lis.forEach((li) => group(li.campaignId).lineItems.push({ ...li, id: String(li._id) }));
    crs.forEach((cr) => {
      const keys = campaignsOf[String(cr._id)] || [`advertiser:${cr.advertiserId}`];
      keys.forEach((k) => {
        const g = group(k);
        g.creatives.push({ ...cr, id: String(cr._id) });
        if (k.startsWith("advertiser:")) g.advertiserId = cr.advertiserId;
      });
    });

    // Campaign, advertiser and network names for every group.
    const campIds = Object.keys(groups).filter((k) => !k.startsWith("advertiser:") && !groups[k].campaignDoc);
    const moreCamps = campIds.length
      ? await MODEL.campaign().find({ _id: { $in: campIds }, orgId: reqBy.org_id })
          .select({ title: 1, type: 1, status: 1, advertiserId: 1, networkId: 1, approval: 1, budget: 1, dailyBudget: 1 })
          .lean()
      : [];
    moreCamps.forEach((c) => (groups[String(c._id)].campaignDoc = c));
    const all = Object.values(groups);
    const advIds = [...new Set(all.map((g) => (g.campaignDoc ? g.campaignDoc.advertiserId : g.advertiserId)).filter(Boolean))];
    const advs = advIds.length ? await advertiserModel().find({ _id: { $in: advIds } }).select({ name: 1, networkId: 1 }).lean() : [];
    const advById = Object.fromEntries(advs.map((a) => [String(a._id), a]));
    const netIds = [...new Set(advs.map((a) => a.networkId).filter(Boolean))];
    const nets = netIds.length ? await networkModel().find({ _id: { $in: netIds } }).select({ name: 1 }).lean() : [];
    const netName = Object.fromEntries(nets.map((n) => [String(n._id), n.name]));

    const latest = (g) =>
      Math.max(
        0,
        ...[g.campaignDoc && g.campaignDoc.approval?.status === data.status ? g.campaignDoc : null, ...g.lineItems, ...g.creatives]
          .filter(Boolean)
          .map((x) => new Date(x.approval?.submittedAt || 0).getTime())
      );
    const out = all
      .map((g) => {
        const c = g.campaignDoc;
        const adv = advById[c ? c.advertiserId : g.advertiserId] || null;
        return {
          key: g.key,
          // The campaign itself is up for review only when its own approval matches.
          campaign: c ? { ...c, id: String(c._id), inReview: c.approval?.status === data.status } : null,
          advertiser: adv ? { id: String(adv._id), name: adv.name } : null,
          network: adv && adv.networkId ? { id: adv.networkId, name: netName[adv.networkId] || null } : null,
          lineItems: g.lineItems,
          creatives: g.creatives,
          submittedAt: latest(g) ? new Date(latest(g)) : null,
        };
      })
      .sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));

    return {
      data: out,
      counts: { campaigns: camps.length, lineItems: lis.length, creatives: crs.length },
    };
  },

  // How many items wait for the org (sidebar badge).
  count: async ({ reqBy }) => {
    const match = { ...scopeOf(reqBy), status: notDeleted, "approval.status": STATUS.PENDING };
    const [campaigns, lineItems, creatives] = await Promise.all(
      [KIND.CAMPAIGN, KIND.LINE_ITEM, KIND.CREATIVE].map((k) => MODEL[k]().countDocuments(match))
    );
    return { data: { total: campaigns + lineItems + creatives, campaigns, lineItems, creatives } };
  },

  // The org approves or rejects items (any mix of kinds) in one go.
  review: async ({ data, reqBy }) => {
    const scope = scopeOf(reqBy);
    const byKind = {};
    data.items.forEach((i) => (byKind[i.kind] = [...new Set([...(byKind[i.kind] || []), i.id])]));
    for (const [kind, ids] of Object.entries(byKind)) {
      const found = await MODEL[kind]().countDocuments({ _id: { $in: ids }, ...scope, status: notDeleted });
      if (found !== ids.length) throw new Error(`One or more ${LABEL[kind]}s don't exist`);
    }
    const status = data.decision === DECISION.APPROVE ? STATUS.APPROVED : STATUS.REJECTED;
    const set = {
      "approval.status": status,
      "approval.note": (data.note || "").trim() || null,
      "approval.reviewedBy": reqBy.user_id || null,
      "approval.reviewedAt": new Date(),
    };
    if (status === STATUS.APPROVED) set["approval.changes"] = [];
    let n = 0;
    for (const [kind, ids] of Object.entries(byKind)) {
      const r = await MODEL[kind]().updateMany({ _id: { $in: ids }, ...scope, status: notDeleted }, { $set: set });
      n += r.modifiedCount || 0;
    }
    const what = `${data.items.length} item${data.items.length === 1 ? "" : "s"}`;
    return {
      message:
        status === STATUS.APPROVED
          ? `Approved ${what}. They bid once the super admin has turned bidding on.`
          : `Rejected ${what}. The network sees your note.`,
      data: { status, updated: n },
    };
  },

  // Send a rejected item back for review without changing it (a material
  // edit resubmits it on its own).
  resubmit: async ({ data, reqBy }) => {
    const doc = await MODEL[data.kind]().findOne({ _id: data.id, ...scopeOf(reqBy), status: notDeleted }).lean();
    if (isUndefinedOrNull(doc)) throw new Error(`No ${LABEL[data.kind]} exists with id: ${data.id}`);
    if (doc.approval?.status !== STATUS.REJECTED) throw new Error(`This ${LABEL[data.kind]} isn't rejected`);
    const now = new Date();
    const next = (await requiresApproval(doc.networkId)) ? pending(reqBy, now, doc.approval.changes || []) : approved(reqBy, now);
    await MODEL[data.kind]().updateOne({ _id: doc._id }, { $set: { approval: next } });
    return {
      message: next.status === STATUS.PENDING ? "Sent to your organization for approval." : "Approved.",
      data: summary({ ...doc, approval: next }),
    };
  },
};

module.exports = approvalService;
