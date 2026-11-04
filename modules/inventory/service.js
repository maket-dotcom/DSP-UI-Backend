const { inventoryAppModel, inventoryUploadModel } = require("./model");
const { KIND, JUNK_KEYS, PARTNERS } = require("./constant");
const { isUndefinedOrNull } = require("../../utils/validators");
const { v4: uuidv4 } = require("uuid");

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// RFC 4180-style CSV: quoted fields, doubled quotes, CRLF or LF, BOM.
const parseCsv = (text) => {
  const rows = [];
  let row = [], field = "", quoted = false;
  const s = String(text).replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((v) => v !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((v) => v !== "")) rows.push(row);
  return rows;
};

// Works out the report's columns from its header row. A "bundle" column makes
// it a bundle report; otherwise an app / site name column makes it a name report.
const readColumns = (header) => {
  const h = header.map((x) => String(x).trim().toLowerCase());
  const find = (re) => h.findIndex((x) => re.test(x));
  const exchange = find(/inventory source|exchange|ssp/);
  const device = find(/device/);
  const requests = find(/request/);
  const bundle = find(/bundle|domain/);
  const name = find(/name/);
  const key = bundle >= 0 ? bundle : name;
  const missing = [];
  if (key < 0) missing.push("App/Site Bundle (or App/Site Name)");
  if (requests < 0) missing.push("Requests");
  if (missing.length) {
    throw new Error(`The file has no ${missing.join(" or ")} column. Found: ${header.join(", ")}`);
  }
  return { kind: bundle >= 0 ? KIND.BUNDLE : KIND.NAME, key, exchange, device, requests };
};

// Turns a report file into inventory rows (junk keys dropped, duplicates of
// key + exchange + device summed).
const toRows = (csvText) => {
  const table = parseCsv(csvText);
  if (table.length < 2) throw new Error("The file has no rows under its header.");
  const cols = readColumns(table[0]);
  const merged = new Map();
  let skipped = 0;
  for (const r of table.slice(1)) {
    let key = String(r[cols.key] || "").trim();
    if (cols.kind === KIND.BUNDLE) key = key.toLowerCase();
    if (JUNK_KEYS.includes(key.toLowerCase())) { skipped++; continue; }
    const exchange = cols.exchange >= 0 ? String(r[cols.exchange] || "").trim().toUpperCase() || null : null;
    const deviceType = cols.device >= 0 ? String(r[cols.device] || "").trim() || null : null;
    const requests = Number(String(r[cols.requests] || "0").replace(/[^0-9.]/g, "")) || 0;
    const id = `${key}\u0000${exchange}\u0000${deviceType}`;
    const row = merged.get(id) || { key, exchange, deviceType, requests: 0 };
    row.requests += requests;
    merged.set(id, row);
  }
  return { kind: cols.kind, rows: [...merged.values()], skipped };
};

// Replaces a country's rows of one kind with a new report. New rows are
// written first and the old ones removed after, so the list never goes empty.
const replaceInventory = async ({ country, kind, rows, fileName, uploadedBy }) => {
  const uploadId = uuidv4();
  for (let i = 0; i < rows.length; i += 2000) {
    await inventoryAppModel.insertMany(
      rows.slice(i, i + 2000).map((r) => ({ ...r, country, kind, uploadId })),
      { ordered: false }
    );
  }
  await inventoryAppModel.deleteMany({ country, kind, uploadId: { $ne: uploadId } });
  const apps = new Set(rows.map((r) => r.key)).size;
  const requests = rows.reduce((s, r) => s + r.requests, 0);
  const saved = await new inventoryUploadModel({
    country, kind, fileName: fileName || null, rows: rows.length, apps, requests, uploadedBy: uploadedBy || null,
  }).save();
  return saved;
};

const inventoryService = {
  parse: toRows,
  replaceInventory,

  // Apps for the line item's Inventory list: one row per app across the
  // matching exchanges and device types, busiest first.
  apps: async ({ data }) => {
    const { country, kind, search, exchange, deviceType, page, limit } = data;
    const match = { country, kind };
    if (exchange) match.exchange = exchange;
    if (deviceType) match.deviceType = deviceType;
    if (!isUndefinedOrNull(search) && search !== "") match.key = new RegExp(escapeRegex(search), "i");
    const [result] = await inventoryAppModel.aggregate([
      { $match: match },
      // Per app + exchange first, so each app lists its exchanges busiest first.
      {
        $group: {
          _id: { key: "$key", exchange: "$exchange" },
          requests: { $sum: "$requests" },
          deviceTypes: { $addToSet: "$deviceType" },
        },
      },
      { $sort: { requests: -1 } },
      {
        $group: {
          _id: "$_id.key",
          requests: { $sum: "$requests" },
          exchanges: { $push: "$_id.exchange" },
          deviceTypes: { $push: "$deviceTypes" },
        },
      },
      {
        $addFields: {
          deviceTypes: { $reduce: { input: "$deviceTypes", initialValue: [], in: { $setUnion: ["$$value", "$$this"] } } },
        },
      },
      { $sort: { requests: -1, _id: 1 } },
      {
        $facet: {
          rows: [{ $skip: (page - 1) * limit }, { $limit: limit }],
          total: [{ $count: "n" }],
        },
      },
    ]);
    const total = (result && result.total[0] && result.total[0].n) || 0;
    return {
      data: ((result && result.rows) || []).map((r) => ({
        key: r._id,
        requests: r.requests,
        exchanges: r.exchanges.filter(Boolean), // busiest first
        deviceTypes: r.deviceTypes.filter(Boolean).sort(),
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  },

  // Filter choices and what's loaded, for the Inventory list header.
  facets: async ({ data }) => {
    const { country } = data;
    const [countries, exchanges, deviceTypes, uploads] = await Promise.all([
      inventoryAppModel.distinct("country"),
      inventoryAppModel.distinct("exchange", { country }),
      inventoryAppModel.distinct("deviceType", { country }),
      inventoryUploadModel.aggregate([
        { $match: { country } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: "$kind", last: { $first: "$$ROOT" } } },
      ]),
    ]);
    return {
      data: {
        country,
        countries: countries.sort(),
        exchanges: exchanges.filter(Boolean).sort(),
        deviceTypes: deviceTypes.filter(Boolean).sort(),
        loaded: Object.fromEntries(
          uploads.map((u) => [u._id, { apps: u.last.apps, requests: u.last.requests, fileName: u.last.fileName, updatedAt: u.last.createdAt }])
        ),
      },
    };
  },

  partners: async () => ({ data: PARTNERS }),

  // Super admin: replace a country's inventory with a new report file.
  upload: async ({ data, reqBy }) => {
    const { kind, rows, skipped } = toRows(data.csv);
    if (!rows.length) throw new Error("No usable rows in the file (every app was blank or 'Not Available').");
    const saved = await replaceInventory({ country: data.country, kind, rows, fileName: data.fileName, uploadedBy: reqBy.user_id });
    return {
      message: `Loaded ${saved.apps.toLocaleString("en-US")} ${kind === KIND.BUNDLE ? "app bundle" : "app name"}${saved.apps === 1 ? "" : "s"} for ${data.country}${
        skipped ? ` (${skipped} row${skipped === 1 ? "" : "s"} without an app skipped)` : ""
      }.`,
      data: saved,
    };
  },

  // Super admin: the latest uploads, newest first.
  uploads: async () => {
    const rows = await inventoryUploadModel.find({}).sort({ createdAt: -1 }).limit(50).lean();
    return { data: rows };
  },
};

module.exports = inventoryService;
