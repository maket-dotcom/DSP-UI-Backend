#!/usr/bin/env node
/**
 * One-time migration: Organization → Advertiser becomes
 * Organization → Network → Advertiser.
 *
 *   node scripts/migrate-networks.js                 # DRY RUN (default): print the plan, write nothing
 *   node scripts/migrate-networks.js --apply         # write it
 *   node scripts/migrate-networks.js --rollback      # undo everything a previous --apply did
 *
 * Options:
 *   --org <orgId>   only this organization
 *   --db  <name>    database name (default: the one in MONGO_URI)
 *
 * What --apply does, per organization that has advertisers or campaigns
 * (publisher orgs are skipped):
 *   1. Network: one "<Org name> Direct" network. Reused if the org already
 *      has a network with that exact name.
 *   2. Advertisers without a network join it.
 *   3. Campaigns, line items, creatives, bid modifiers, delivery modifiers and
 *      advertiser presets take their advertiser's network. Campaigns created
 *      before advertisers existed join the Direct network.
 *   4. Uploaded media used as a creative takes that creative's network.
 *   5. Existing campaigns, line items and creatives are marked approved, so
 *      nothing waits in the org's approval queue or stops bidding.
 *
 * Users stay organization users, and targeting lists and presets without an
 * advertiser stay organization items (private), so nothing an org user sees
 * changes. The bid engine ignores networkId, so bidding is unaffected.
 *
 * Every network it creates carries migration: "networks-v1", every document
 * it moves into a network gets migrationNetwork: "networks-v1", and every one
 * it marks approved gets migrationApproval: "networks-v1", which is what
 * --rollback uses.
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const mongoose = require("mongoose");

const TAG = "networks-v1";
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

// Collections whose documents take their advertiser's network.
const BY_ADVERTISER = ["lineitemmodels", "creativemodels", "bidmodifiermodels", "deliverymodifiermodels", "presetmodels"];
// Every collection the migration writes networkId into.
const TOUCHED = ["advertisermodels", "campaignmodels", ...BY_ADVERTISER, "mediamodels"];
// Collections with an approval status.
const APPROVABLE = ["campaignmodels", "lineitemmodels", "creativemodels"];

const noNetwork = { $in: [null, ""] }; // also matches a missing field
const orgFilter = ONLY_ORG ? { orgId: ONLY_ORG } : {};

async function rollback(db) {
  const counts = { networks: await db.collection("networkmodels").countDocuments({ migration: TAG, ...orgFilter }) };
  for (const name of TOUCHED) {
    counts[name] = await db.collection(name).countDocuments({ migrationNetwork: TAG, ...orgFilter });
  }
  for (const name of APPROVABLE) {
    counts[`${name} approvals`] = await db.collection(name).countDocuments({ migrationApproval: TAG, ...orgFilter });
  }
  console.log(`rollback ${APPLY ? "" : "(dry run) "}would undo:`, counts);
  if (!APPLY) {
    console.log("\nDry run. Add --apply to roll back.");
    return;
  }
  for (const name of TOUCHED) {
    await db.collection(name).updateMany(
      { migrationNetwork: TAG, ...orgFilter },
      { $unset: { networkId: "", migrationNetwork: "" } }
    );
  }
  for (const name of APPROVABLE) {
    await db.collection(name).updateMany(
      { migrationApproval: TAG, ...orgFilter },
      { $unset: { approval: "", migrationApproval: "" } }
    );
  }
  await db.collection("networkmodels").deleteMany({ migration: TAG, ...orgFilter });
  console.log("Rolled back.");
}

// Sets networkId on the given documents and tags them for rollback.
async function setNetwork(db, name, filter, networkId) {
  const n = await db.collection(name).countDocuments(filter);
  if (APPLY && n) {
    await db.collection(name).updateMany(filter, { $set: { networkId, migrationNetwork: TAG } });
  }
  return n;
}

async function migrate(db) {
  const orgs = db.collection("orgmodels");
  const networks = db.collection("networkmodels");
  const advertisers = db.collection("advertisermodels");

  // Orgs that run demand: they own advertisers or campaigns.
  const orgIds = [
    ...new Set([
      ...(await advertisers.distinct("orgId", orgFilter)),
      ...(await db.collection("campaignmodels").distinct("orgId", orgFilter)),
    ]),
  ].filter(Boolean);

  const summary = { orgs: 0, networksCreated: 0, networksReused: 0, skipped: 0 };
  TOUCHED.forEach((name) => (summary[name] = 0));
  APPROVABLE.forEach((name) => (summary[`${name} approved`] = 0));

  for (const orgId of orgIds) {
    const org = await orgs.findOne({ _id: new mongoose.Types.ObjectId(String(orgId)) }).catch(() => null);
    if (!org) {
      console.log(`! org ${orgId}: not found, skipped`);
      summary.skipped++;
      continue;
    }
    if (org.type === "publisher") {
      summary.skipped++;
      continue;
    }
    summary.orgs++;

    // 1. The org's Direct network.
    const name = `${org.name || "Organization"} Direct`;
    let network = await networks.findOne({ orgId: String(orgId), name, status: { $ne: "deleted" } });
    let networkId;
    if (network) {
      networkId = String(network._id);
      summary.networksReused++;
    } else {
      const now = new Date();
      network = {
        _id: new mongoose.Types.ObjectId(),
        orgId: String(orgId),
        name,
        status: "active",
        adminId: null,
        contactName: null,
        contactEmail: null,
        // The org's own work: nothing waits for approval.
        requireApproval: false,
        notes: "Created by the network migration for the organization's existing advertisers.",
        createdBy: null,
        updatedBy: null,
        migration: TAG,
        createdAt: now,
        updatedAt: now,
      };
      if (APPLY) await networks.insertOne(network);
      networkId = String(network._id);
      summary.networksCreated++;
    }
    console.log(`\n${org.name} (${orgId}) → network "${name}" ${networkId}${network.migration === TAG ? "" : " (existing)"}`);

    // 2. Advertisers without a network.
    const n = await setNetwork(db, "advertisermodels", { orgId: String(orgId), networkId: noNetwork }, networkId);
    summary.advertisermodels += n;
    console.log(`   advertisers: ${n}`);

    // Every advertiser's network (including ones that already had one).
    const advNetwork = {};
    const advRows = await advertisers.find({ orgId: String(orgId) }).project({ networkId: 1 }).toArray();
    advRows.forEach((a) => (advNetwork[String(a._id)] = a.networkId || networkId));
    const byNetwork = {};
    Object.entries(advNetwork).forEach(([advId, net]) => (byNetwork[net] = [...(byNetwork[net] || []), advId]));

    // 3. Campaigns and the per-advertiser records take their advertiser's network.
    for (const name of ["campaignmodels", ...BY_ADVERTISER]) {
      let total = 0;
      for (const [net, advIds] of Object.entries(byNetwork)) {
        total += await setNetwork(db, name, { orgId: String(orgId), advertiserId: { $in: advIds }, networkId: noNetwork }, net);
      }
      if (name === "campaignmodels") {
        // Campaigns from before advertisers existed.
        total += await setNetwork(
          db,
          name,
          { orgId: String(orgId), advertiserId: { $in: [null, ""] }, networkId: noNetwork },
          networkId
        );
      }
      summary[name] += total;
      console.log(`   ${name.replace("models", "s")}: ${total}`);
    }

    // 4. Media used as a creative (the creative _id is the upload's _id).
    const creatives = await db
      .collection("creativemodels")
      .find({ orgId: String(orgId) })
      .project({ _id: 1, networkId: 1, advertiserId: 1 })
      .toArray();
    let media = 0;
    for (const [net, advIds] of Object.entries(byNetwork)) {
      const ids = creatives.filter((c) => advIds.includes(String(c.advertiserId))).map((c) => c._id);
      if (ids.length) {
        media += await setNetwork(db, "mediamodels", { _id: { $in: ids }, orgId: String(orgId), networkId: noNetwork }, net);
      }
    }
    summary.mediamodels += media;
    console.log(`   media: ${media}`);

    // 5. Everything that exists today counts as approved.
    const now = new Date();
    for (const name of APPROVABLE) {
      const filter = { orgId: String(orgId), "approval.status": { $exists: false } };
      const n = await db.collection(name).countDocuments(filter);
      if (APPLY && n) {
        await db.collection(name).updateMany(filter, {
          $set: {
            approval: { status: "approved", note: "Approved by the network migration", reviewedAt: now },
            migrationApproval: TAG,
          },
        });
      }
      summary[`${name} approved`] += n;
      console.log(`   ${name.replace("models", "s")} marked approved: ${n}`);
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
