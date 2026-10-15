#!/usr/bin/env node
/**
 * One-time migration: flat campaigns → Advertiser → Campaign → Line Item → Creative.
 *
 *   node scripts/migrate-line-items.js                 # DRY RUN (default): print the plan, write nothing
 *   node scripts/migrate-line-items.js --apply         # write it
 *   node scripts/migrate-line-items.js --rollback      # undo everything a previous --apply created
 *
 * Options:
 *   --org <orgId>   only this organization
 *   --db  <name>    database name (default: the one in MONGO_URI)
 *
 * What --apply does, per non-deleted campaign that has no advertiserId yet:
 *   1. Advertiser: one per (org, app name), named after the app. Reused if the
 *      org already has an advertiser with that exact name.
 *   2. Campaign: sets advertiserId (and budgetType "spend" if missing). Campaign
 *      ids never change, so existing reports keep working. The old targeting and
 *      media fields are left in place.
 *   3. Creatives: one per media item, keeping the media item's id as the
 *      creative _id, so creative ids already in events and reports still match.
 *   4. Line item "Default": copies geo, custom geo, audience, inventory type and
 *      partners; format from the campaign type; bidding "inherit" so the bid is
 *      exactly what the campaign bids today (Bid Configuration → event price).
 *      Active only if the campaign is active AND it has a matching creative.
 *
 * Until a campaign has a line item, the bid engine bids it through a synthetic
 * line item built from these same campaign fields, so bidding never stops
 * during or after the migration.
 *
 * Every document it creates carries migration: "line-items-v1", and every
 * campaign it touches gets migration fields, which is what --rollback uses.
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const mongoose = require("mongoose");

const TAG = "line-items-v1";
const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const arg = (f) => {
  const i = args.indexOf(f);
  return i >= 0 ? args[i + 1] : undefined;
};
const APPLY = has("--apply");
const ROLLBACK = has("--rollback");
const ONLY_ORG = arg("--org");
const DB_NAME = arg("--db");

const isHex = (v) => typeof v === "string" && /^[a-fA-F0-9]{24}$/.test(v);
const norm = (s) => String(s || "").trim().toLowerCase();
const fileName = (link) => {
  try {
    return decodeURIComponent(new URL(link).pathname.split("/").pop() || "") || null;
  } catch {
    return null;
  }
};

async function rollback(db) {
  const filter = { migration: TAG, ...(ONLY_ORG ? { orgId: ONLY_ORG } : {}) };
  const counts = {
    lineItems: await db.collection("lineitemmodels").countDocuments(filter),
    creatives: await db.collection("creativemodels").countDocuments(filter),
    advertisers: await db.collection("advertisermodels").countDocuments(filter),
    campaigns: await db.collection("campaignmodels").countDocuments({
      migrationAdvertiser: TAG,
      ...(ONLY_ORG ? { orgId: ONLY_ORG } : {}),
    }),
  };
  console.log(`rollback ${APPLY ? "" : "(dry run) "}would remove:`, counts);
  if (!APPLY) {
    console.log("\nDry run. Add --apply to roll back.");
    return;
  }
  await db.collection("lineitemmodels").deleteMany(filter);
  await db.collection("creativemodels").deleteMany(filter);
  await db.collection("advertisermodels").deleteMany(filter);
  await db.collection("campaignmodels").updateMany(
    { migrationAdvertiser: TAG, ...(ONLY_ORG ? { orgId: ONLY_ORG } : {}) },
    { $unset: { advertiserId: "", migrationAdvertiser: "" } }
  );
  console.log("rolled back.");
}

async function migrate(db) {
  const campaigns = db.collection("campaignmodels");
  const advertisers = db.collection("advertisermodels");
  const lineItems = db.collection("lineitemmodels");
  const creatives = db.collection("creativemodels");

  const query = {
    status: { $ne: "deleted" },
    $or: [{ advertiserId: { $exists: false } }, { advertiserId: null }, { advertiserId: "" }],
    ...(ONLY_ORG ? { orgId: ONLY_ORG } : {}),
  };
  const todo = await campaigns.find(query).sort({ createdAt: 1 }).toArray();
  console.log(`${todo.length} campaign(s) without an advertiser${ONLY_ORG ? ` in org ${ONLY_ORG}` : ""}\n`);
  if (!todo.length) return;

  // 1. Group into advertisers: one per (org, app name).
  const groups = new Map();
  for (const c of todo) {
    const label = (c.appName || c.title || "Untitled").trim();
    const key = `${c.orgId}|${norm(label)}`;
    if (!groups.has(key)) groups.set(key, { orgId: c.orgId, name: label, campaigns: [] });
    groups.get(key).campaigns.push(c);
  }

  const now = new Date();
  const summary = { advertisersCreated: 0, advertisersReused: 0, campaigns: 0, lineItems: 0, creatives: 0, creativesReused: 0 };

  for (const g of groups.values()) {
    const first = g.campaigns[0];
    const oses = [...new Set(g.campaigns.map((c) => c.appOs).filter(Boolean))];

    let adv = await advertisers.findOne({ orgId: g.orgId, name: g.name, status: { $ne: "deleted" } });
    const advDoc = adv || {
      _id: new mongoose.Types.ObjectId(),
      orgId: g.orgId,
      name: g.name,
      domain: null, // unknown — the UI asks for it the next time the advertiser is edited
      appBundle: first.bundleId || null,
      appName: first.appName || null,
      appOs: oses.length === 1 ? oses[0] : null,
      appIconLink: first.appIconLink || null,
      category: null, // unknown — required when the advertiser is next edited
      alternativeId: null,
      notes: "Created by the line item migration",
      status: "active",
      defaults: {
        geo: first.geo || [],
        currency: first.currency || "USD",
        clickUrl: null,
        mmpPlatform: first.mmpPlatform || null,
      },
      createdBy: null,
      updatedBy: null,
      migration: TAG,
      createdAt: now,
      updatedAt: now,
    };
    if (adv) summary.advertisersReused++;
    else summary.advertisersCreated++;

    console.log(`Advertiser ${adv ? "(existing)" : "(new)     "} "${g.name}"  org=${g.orgId}`);
    if (APPLY && !adv) await advertisers.insertOne(advDoc);
    const advId = String(advDoc._id);

    for (const c of g.campaigns) {
      const cid = String(c._id);
      const format = c.type === "ctv" ? "video" : "banner";
      const media = (c.media || []).filter((m) => m && (m.link || m.vastTag));

      // 3. Creatives (all media, so the advertiser library is complete).
      const creativeIds = [];
      for (const m of media) {
        const isVideo = m.type === "video";
        let id = isHex(m.id) ? m.id : null;
        let reused = false;
        if (id) {
          const existing = await creatives.findOne({ _id: new mongoose.Types.ObjectId(id) });
          if (existing && existing.advertiserId === advId) reused = true;
          else if (existing) id = null; // same upload used by another advertiser → its own copy
        }
        const crId = id ? new mongoose.Types.ObjectId(id) : new mongoose.Types.ObjectId();
        if (!reused) {
          const doc = {
            _id: crId,
            orgId: c.orgId,
            advertiserId: advId,
            name: fileName(m.link) || (isVideo ? "Video" : "Image"),
            type: isVideo ? "video" : "image",
            status: "active",
            link: m.link || null,
            w: m.w ?? null,
            h: m.h ?? null,
            clickUrl: null,
            createdBy: null,
            updatedBy: null,
            migration: TAG,
            createdAt: now,
            updatedAt: now,
          };
          if (isVideo) {
            if (m.duration != null) doc.duration = m.duration;
            if (m.vastTag) doc.vastTag = m.vastTag;
            if (m.mime) doc.mime = m.mime;
          }
          if (APPLY) await creatives.insertOne(doc);
          summary.creatives++;
        } else {
          summary.creativesReused++;
        }
        if (isVideo === (format === "video")) creativeIds.push(String(crId));
      }

      // 4. Default line item (only if the campaign has none yet).
      const hasLineItem = await lineItems.countDocuments({ campaignId: cid, status: { $ne: "deleted" } });
      let liNote = "has line items already";
      if (!hasLineItem) {
        const active = c.status === "active" && creativeIds.length > 0;
        const li = {
          orgId: c.orgId,
          advertiserId: advId,
          campaignId: cid,
          name: "Default",
          format,
          status: active ? "active" : "paused",
          alternativeId: null,
          notes: "Created by the line item migration from the campaign's own targeting",
          startDate: null,
          endDate: null,
          budget: null,
          dailyBudget: null,
          pacing: "asap",
          bidding: { strategy: "inherit", cpm: null, maxCpm: null },
          targeting: {
            geo: {
              countries: {
                // "all" (UI "Global (All)") means no country limit.
                include: (c.geo || []).some((g) => String(g).toLowerCase() === "all") ? [] : c.geo || [],
                exclude: [],
              },
              custom: c.isCustomTargating ? (c.customTargating || []) : [],
            },
            segments: {
              audienceTarget: c.audienceTarget || "all",
              customAudienceIds: c.customAudienceIds || [],
            },
            exchange: {
              inventoryType: c.inventoryType || "programmatic",
              oemPremiumPartners: c.oemPremiumPartners || [],
            },
          },
          creatives: creativeIds.map((creativeId) => ({ creativeId })),
          createdBy: null,
          updatedBy: null,
          migration: TAG,
          createdAt: now,
          updatedAt: now,
        };
        if (APPLY) await lineItems.insertOne(li);
        summary.lineItems++;
        liNote = `line item "Default" ${format}, ${li.status}, ${creativeIds.length} creative(s), geo ${(c.geo || []).join("/") || "all"}`;
      }

      // 2. Campaign → advertiser.
      if (APPLY) {
        await campaigns.updateOne(
          { _id: c._id },
          {
            $set: {
              advertiserId: advId,
              migrationAdvertiser: TAG,
              ...(c.budgetType ? {} : { budgetType: "spend" }),
            },
          }
        );
      }
      summary.campaigns++;
      console.log(`   └ ${c.title} [${c.type}/${c.appOs || "-"}, ${c.status}]  ${cid}  → ${liNote}`);
    }
  }

  console.log("\nSummary:", summary);
  if (!APPLY) console.log("\nDry run: nothing was written. Re-run with --apply to migrate.");
}

(async () => {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is not set (looked in DSP-UI-Backend/.env)");
  await mongoose.connect(process.env.MONGO_URI, DB_NAME ? { dbName: DB_NAME } : {});
  const db = mongoose.connection.db;
  console.log(`db=${db.databaseName}  mode=${ROLLBACK ? "rollback" : "migrate"}${APPLY ? "" : " (DRY RUN)"}\n`);
  if (ROLLBACK) await rollback(db);
  else await migrate(db);
  await mongoose.disconnect();
})().catch(async (e) => {
  console.error("FAILED:", e);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
