const XLSX = require("xlsx");
const { v4: uuidv4 } = require("uuid");
const { segmentModel, segmentUploadModel } = require("./model");
const {
  SOURCE,
  STATUS,
  ROUTE,
  REQUEST_CATEGORIES,
  MODELED_CATEGORIES,
  IAB_SEGTAX,
  DEFAULT_BASE_MN,
} = require("./constant");
const { REQUEST_RULES, NOT_OFFERED, IAB_NOT_OFFERED_ROOTS, IAB_NOT_OFFERED_WORDS } = require("./rules");
const iabTaxonomy = require("./data/iab-audience-1.1.json");

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const round1 = (n) => Math.round(n * 10) / 10;
const scaleTier = (mn) => (mn >= 100 ? "Mass" : mn >= 25 ? "Large" : mn >= 5 ? "Mid" : "Niche");
const catalogKey = (country, number) => `${country.toLowerCase()}.${number}`;
const iabKey = (id) => `iab${IAB_SEGTAX}.${id}`;

/* ------------------------------------------------------------ workbook */

// Finds the segments sheet (the one whose header has "Segment Name") and the
// addressable base from the Assumptions sheet, in an .xlsx or a .csv.
const readWorkbook = (buffer, fileName) => {
  const wb = /\.csv$/i.test(fileName || "")
    ? XLSX.read(buffer.toString("utf8"), { type: "string" })
    : XLSX.read(buffer, { type: "buffer" });
  let table = null;
  let baseMn = null;
  for (const name of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: "", raw: true });
    const h = rows.findIndex((r) => r.some((c) => /segment name/i.test(String(c))));
    if (h >= 0 && !table) table = { header: rows[h].map((c) => String(c).trim()), rows: rows.slice(h + 1) };
    const base = rows.find((r) => /reachable monthly unique/i.test(String(r[0])));
    if (base && Number(base[1]) > 0) baseMn = Number(base[1]);
  }
  if (!table) throw new Error('No sheet has a "Segment Name" column.');
  return { table, baseMn: baseMn || DEFAULT_BASE_MN };
};

const readColumns = (header) => {
  const h = header.map((x) => x.toLowerCase());
  const find = (re) => h.findIndex((x) => re.test(x));
  const cols = {
    number: find(/^(#|no\.?|s\.? ?no\.?|sr\.? ?no\.?)$/),
    category: find(/^category$/),
    subCategory: find(/sub.?category/),
    name: find(/segment name/),
    definition: find(/definition|qualifying/),
    signalType: find(/signal type/),
    pct: find(/%|percent|share of/),
    reach: find(/reach/),
    tier: find(/scale|tier/),
    verticals: find(/vertical/),
  };
  const missing = ["category", "name"].filter((k) => cols[k] < 0);
  if (missing.length) throw new Error(`The segments sheet has no ${missing.join(" or ")} column. Found: ${header.join(", ")}`);
  return cols;
};

// Whether and how a workbook segment can be targeted.
const classify = (category, name) => {
  if (NOT_OFFERED[name]) return { route: routeOf(category), status: STATUS.NOT_OFFERED, reason: NOT_OFFERED[name] };
  const route = routeOf(category);
  if (route === ROUTE.REQUEST) {
    const r = REQUEST_RULES[name];
    if (r && r.rule) return { route, status: STATUS.LIVE, rule: r.rule, note: r.note || null };
    return { route, status: STATUS.NEEDS_DATA, reason: (r && r.reason) || "No bid-request rule for it yet" };
  }
  if (route === ROUTE.MODELED) {
    return { route, status: STATUS.NEEDS_DATA, reason: "Needs a data partner or a model (age, gender, household)" };
  }
  return { route, status: STATUS.NEEDS_DATA, reason: "Needs the device's app-usage history" };
};

const routeOf = (category) =>
  REQUEST_CATEGORIES.includes(category)
    ? ROUTE.REQUEST
    : MODELED_CATEGORIES.includes(category)
      ? ROUTE.MODELED
      : ROUTE.APP_USAGE;

// Workbook → catalog rows. Reach is the sheet's % × the addressable base.
const toCatalogRows = ({ table, baseMn }, country) => {
  const cols = readColumns(table.header);
  const cell = (r, i) => (i >= 0 ? String(r[i] ?? "").trim() : "");
  const out = [];
  const seen = new Set();
  table.rows.forEach((r, i) => {
    const name = cell(r, cols.name);
    if (!name) return;
    const number = Number(cell(r, cols.number)) || i + 1;
    if (seen.has(number)) throw new Error(`Segment # ${number} appears twice in the sheet.`);
    seen.add(number);
    const category = cell(r, cols.category);
    let pct = Number(cell(r, cols.pct));
    if (!(pct > 0)) pct = null;
    else if (pct > 1) pct = pct / 100; // "22" means 22%
    const reachMn = pct ? round1(pct * baseMn) : Number(cell(r, cols.reach)) || null;
    out.push({
      key: catalogKey(country, number),
      source: SOURCE.CATALOG,
      country,
      number,
      name,
      category: category || null,
      subCategory: cell(r, cols.subCategory) || null,
      path: null,
      definition: cell(r, cols.definition) || null,
      signalType: cell(r, cols.signalType) || null,
      verticals: cell(r, cols.verticals) || null,
      reachPct: pct,
      reachMn,
      scaleTier: cell(r, cols.tier) || (reachMn ? scaleTier(reachMn) : null),
      rule: null,
      note: null,
      reason: null,
      ...classify(category, name),
    });
  });
  if (!out.length) throw new Error("The segments sheet has no rows under its header.");
  return out;
};

const parse = (buffer, fileName, country) => {
  const wb = readWorkbook(buffer, fileName);
  return { rows: toCatalogRows(wb, country), baseMn: wb.baseMn };
};

/* ----------------------------------------------------------------- IAB */

// IAB Audience Taxonomy 1.1 as catalog rows. Sensitive branches are kept,
// so a line item that names them sees why, but they can't be targeted.
const iabRows = () => {
  const byId = new Map(iabTaxonomy.segments.map((s) => [s.id, s]));
  const reasons = new Map();
  const reasonOf = (s) => {
    if (!s) return null;
    if (reasons.has(s.id)) return reasons.get(s.id);
    const own = s.tiers[s.tiers.length - 1];
    const hit = IAB_NOT_OFFERED_WORDS.find(([re]) => re.test(own));
    const r = IAB_NOT_OFFERED_ROOTS[s.id] || (hit && hit[1]) || reasonOf(byId.get(s.parentId));
    reasons.set(s.id, r || null);
    return r || null;
  };
  return iabTaxonomy.segments.map((s) => {
    const ancestors = [];
    for (let p = s.parentId; p; p = byId.get(p) ? byId.get(p).parentId : null) ancestors.unshift(String(p));
    const reason = reasonOf(s);
    return {
      key: iabKey(s.id),
      source: SOURCE.IAB,
      country: null,
      number: s.id,
      name: s.tiers[s.tiers.length - 1],
      category: s.tiers[0],
      subCategory: s.tiers[1] || null,
      path: s.tiers.join(" | "),
      route: ROUTE.EXCHANGE,
      status: reason ? STATUS.NOT_OFFERED : STATUS.LIVE,
      reason,
      segtax: IAB_SEGTAX,
      segId: String(s.id),
      ancestors,
    };
  });
};

// Loads (or refreshes) the IAB taxonomy. Safe to run any number of times.
const seedIab = async () => {
  const rows = iabRows();
  await segmentModel.bulkWrite(
    rows.map((r) => ({ updateOne: { filter: { key: r.key }, update: { $set: r }, upsert: true } })),
    { ordered: false }
  );
  return { segments: rows.length, live: rows.filter((r) => r.status === STATUS.LIVE).length };
};

/* ------------------------------------------------------------- catalog */

// Replaces a country's catalog with a new workbook. Segments the new
// workbook no longer has stay, marked not offered, so line items that name
// them show why instead of an unknown id.
const replaceCatalog = async ({ country, rows, baseMn, fileName, uploadedBy }) => {
  const uploadId = uuidv4();
  await segmentModel.bulkWrite(
    rows.map((r) => ({
      updateOne: { filter: { key: r.key }, update: { $set: { ...r, uploadId } }, upsert: true },
    })),
    { ordered: false }
  );
  await segmentModel.updateMany(
    { source: SOURCE.CATALOG, country, uploadId: { $ne: uploadId } },
    { $set: { status: STATUS.NOT_OFFERED, reason: "No longer in the segment catalog", rule: null } }
  );
  const live = rows.filter((r) => r.status === STATUS.LIVE).length;
  await new segmentUploadModel({
    country, fileName: fileName || null, baseMn, segments: rows.length, live, uploadedBy: uploadedBy || null,
  }).save();
  return { segments: rows.length, live, baseMn };
};

/* ------------------------------------------------------------ describe */

const LABEL = { 2: "on Wi-Fi", 7: "on 5G" };
const shortList = (xs, n = 6) => (xs.length > n ? `${xs.slice(0, n).join(", ")} +${xs.length - n} more` : xs.join(", "));
const quoted = (xs) => xs.map((x) => `"${x}"`).join(", ");
const title = (s) => s.replace(/(^|[\s-])\w/g, (c) => c.toUpperCase());

// One line on how the engine decides a segment, for the UI.
const describe = (seg) => {
  if (seg.source === SOURCE.IAB) return `The exchange sends IAB audience ${seg.segId} (segtax ${seg.segtax}) or one under it`;
  if (seg.note) return seg.note;
  const r = seg.rule;
  if (!r) return null;
  const parts = [];
  if (r.regions && r.regions.length) parts.push(`State is in ${seg.name}`);
  if (r.cities && r.cities.length) parts.push(`City is ${shortList(r.cities.map(title))}`);
  if (r.languages && r.languages.length) parts.push(`Device language is ${quoted(r.languages)}`);
  if (r.os) parts.push(`${r.os === "ios" ? "iOS" : "Android"}${r.osvMin ? ` ${r.osvMin} or later` : ""}`);
  if (r.makes && r.makes.length) parts.push(`Make is ${quoted(r.makes)}`);
  if (r.carriers && r.carriers.length) parts.push(`Carrier name has ${quoted(r.carriers)}`);
  if (r.connectionTypes && r.connectionTypes.length) parts.push(r.connectionTypes.map((c) => LABEL[c] || `connection type ${c}`).join(" or "));
  if (r.deviceTypes && r.deviceTypes.length) parts.push(r.deviceTypes.includes(5) ? "Tablet" : `Device type ${r.deviceTypes.join(", ")}`);
  if (!parts.length) return null;
  return parts.join(", ") + (r.country && (r.regions || r.cities) ? ` (${r.country})` : "");
};

const PUBLIC_FIELDS = {
  key: 1, source: 1, country: 1, number: 1, name: 1, category: 1, subCategory: 1, path: 1, definition: 1,
  signalType: 1, verticals: 1, route: 1, status: 1, reason: 1, note: 1, reachPct: 1, reachMn: 1, scaleTier: 1,
  rule: 1, segtax: 1, segId: 1,
};
const present = (s) => {
  const { rule, _id, ...rest } = s;
  return { ...rest, match: describe(s) };
};

/* ------------------------------------------------------------- service */

const segmentService = {
  parse,
  replaceCatalog,
  seedIab,
  describe,

  list: async ({ data }) => {
    const { source, country, search, category, status, route, page, limit } = data;
    const query = { source };
    if (source === SOURCE.CATALOG) query.country = country;
    if (category) query.category = category;
    if (status) query.status = status;
    if (route) query.route = route;
    if (search) {
      const rx = new RegExp(escapeRegex(search), "i");
      query.$or = [{ name: rx }, { category: rx }, { subCategory: rx }, { path: rx }, { definition: rx }];
    }
    const [rows, total] = await Promise.all([
      segmentModel.find(query).select(PUBLIC_FIELDS).sort({ number: 1 }).skip((page - 1) * limit).limit(limit).lean(),
      segmentModel.countDocuments(query),
    ]);
    return {
      data: rows.map(present),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  },

  // Counts per status and category, for the Audiences page and the picker.
  facets: async ({ data }) => {
    const { country } = data;
    const summarize = async (match) => {
      const rows = await segmentModel.aggregate([
        { $match: match },
        { $sort: { number: 1 } },
        {
          $group: {
            _id: "$category",
            first: { $min: "$number" },
            total: { $sum: 1 },
            live: { $sum: { $cond: [{ $eq: ["$status", STATUS.LIVE] }, 1, 0] } },
            needsData: { $sum: { $cond: [{ $eq: ["$status", STATUS.NEEDS_DATA] }, 1, 0] } },
            notOffered: { $sum: { $cond: [{ $eq: ["$status", STATUS.NOT_OFFERED] }, 1, 0] } },
          },
        },
        { $sort: { first: 1 } },
      ]);
      const sum = (k) => rows.reduce((s, r) => s + r[k], 0);
      return {
        total: sum("total"),
        live: sum("live"),
        needsData: sum("needsData"),
        notOffered: sum("notOffered"),
        categories: rows.map((r) => ({ name: r._id, total: r.total, live: r.live })),
      };
    };
    const [catalog, iab, upload] = await Promise.all([
      summarize({ source: SOURCE.CATALOG, country }),
      summarize({ source: SOURCE.IAB }),
      segmentUploadModel.findOne({ country }).sort({ createdAt: -1 }).lean(),
    ]);
    return {
      data: {
        country,
        catalog: { ...catalog, baseMn: upload ? upload.baseMn : null, fileName: upload ? upload.fileName : null, updatedAt: upload ? upload.createdAt : null },
        iab: { ...iab, segtax: IAB_SEGTAX },
      },
    };
  },

  // The segments behind a line item's keys, for its chips.
  resolve: async ({ data }) => {
    const rows = await segmentModel.find({ key: { $in: data.keys } }).select(PUBLIC_FIELDS).lean();
    const byKey = new Map(rows.map((r) => [r.key, present(r)]));
    return { data: data.keys.map((k) => byKey.get(k) || { key: k, name: k, status: null, reason: "Not in the catalog" }) };
  },

  // A line item may only add segments that are live. Ones it already had
  // stay, so an unrelated edit isn't refused when a segment goes out of use.
  assertUsable: async ({ audiences, previous }) => {
    const keys = [...new Set([...(audiences?.include || []), ...(audiences?.exclude || [])])];
    if (!keys.length) return;
    const had = new Set([...(previous?.include || []), ...(previous?.exclude || [])]);
    const rows = await segmentModel.find({ key: { $in: keys } }).select({ key: 1, name: 1, status: 1, reason: 1 }).lean();
    const byKey = new Map(rows.map((r) => [r.key, r]));
    for (const k of keys) {
      const s = byKey.get(k);
      if (!s) throw new Error(`No audience segment exists with key: ${k}`);
      if (s.status !== STATUS.LIVE && !had.has(k)) {
        throw new Error(`"${s.name}" can't be targeted yet: ${s.reason || "it isn't live"}`);
      }
    }
  },

  // Super admin: replace a country's catalog with a workbook (.xlsx or .csv).
  upload: async ({ data, reqBy }) => {
    const buffer = Buffer.from(data.file, "base64");
    if (!buffer.length) throw new Error("The file is empty.");
    const { rows, baseMn } = parse(buffer, data.fileName, data.country);
    const saved = await replaceCatalog({ country: data.country, rows, baseMn, fileName: data.fileName, uploadedBy: reqBy.user_id });
    await seedIab();
    const needs = rows.filter((r) => r.status === STATUS.NEEDS_DATA).length;
    const off = rows.filter((r) => r.status === STATUS.NOT_OFFERED).length;
    return {
      message: `Loaded ${saved.segments} segments for ${data.country}: ${saved.live} live, ${needs} need data, ${off} not offered.`,
      data: saved,
    };
  },

  uploads: async () => ({ data: await segmentUploadModel.find({}).sort({ createdAt: -1 }).limit(50).lean() }),
};

module.exports = segmentService;
