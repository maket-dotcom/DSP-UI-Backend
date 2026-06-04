const axios = require("axios");
const cheerio = require("cheerio");
const { isUndefinedOrNull } = require("../validators");

const PLATFORM = { IOS: "ios", ANDROID: "android" };
const REQUEST_TIMEOUT_MS = 10000;
// Apple's lookup is storefront-specific. When no country is given we sweep the
// busiest storefronts so region-locked listings still resolve.
const DEFAULT_COUNTRY_SWEEP = [
  "us",
  "gb",
  "in",
  "ca",
  "au",
  "de",
  "fr",
  "jp",
  "kr",
  "br",
];

const playStoreUrl = (bundleId) =>
  `https://play.google.com/store/apps/details?id=${encodeURIComponent(
    bundleId
  )}`;

// "id1495077102" or "1495077102" => numeric App Store track id; otherwise it's
// a reverse-DNS bundle identifier ("net.whatsapp.WhatsApp").
const asAppleTrackId = (value) => {
  const v = `${value}`.trim().replace(/^id/i, "");
  return /^\d+$/.test(v) ? v : null;
};

// One iTunes lookup hit against a specific storefront. Returns the raw result
// (or null when that storefront has no such app).
const lookupIosInCountry = async (bundleId, country) => {
  const trackId = asAppleTrackId(bundleId);
  const idParam = trackId
    ? `id=${encodeURIComponent(trackId)}`
    : `bundleId=${encodeURIComponent(bundleId)}`;
  const url = `https://itunes.apple.com/lookup?${idParam}&country=${encodeURIComponent(
    country
  )}`;
  const { data } = await axios.get(url, { timeout: REQUEST_TIMEOUT_MS });

  if (
    isUndefinedOrNull(data) ||
    !data.resultCount ||
    !Array.isArray(data.results) ||
    data.results.length === 0
  ) {
    return null;
  }
  return data.results[0];
};

// Apple's public iTunes lookup API — no key required. Accepts either a numeric
// track id (?id=) or a bundle identifier (?bundleId=). When `country` is given
// only that storefront is checked; otherwise the busiest storefronts are swept.
const lookupIos = async (bundleId, country) => {
  const countries = isUndefinedOrNull(country)
    ? DEFAULT_COUNTRY_SWEEP
    : [country];

  let a = null;
  let matchedCountry = null;
  for (const c of countries) {
    // eslint-disable-next-line no-await-in-loop
    a = await lookupIosInCountry(bundleId, c).catch(() => null);
    if (a) {
      matchedCountry = c;
      break;
    }
  }
  if (!a) return null;

  return {
    platform: PLATFORM.IOS,
    store: "app_store",
    country: matchedCountry,
    bundleId: a.bundleId || bundleId,
    appId: isUndefinedOrNull(a.trackId) ? null : String(a.trackId),
    title: a.trackName || null,
    url: a.trackViewUrl || null,
    iconUrl: a.artworkUrl512 || a.artworkUrl100 || a.artworkUrl60 || null,
    developer: a.sellerName || a.artistName || null,
    category: a.primaryGenreName || null,
    rating: isUndefinedOrNull(a.averageUserRating) ? null : a.averageUserRating,
    ratingCount: isUndefinedOrNull(a.userRatingCount)
      ? null
      : a.userRatingCount,
    price: a.formattedPrice || (a.price === 0 ? "Free" : null),
    version: a.version || null,
    description: a.description || null,
  };
};

// Google Play has no public lookup API; read the store page's metadata tags.
const lookupAndroid = async (bundleId) => {
  const canonicalUrl = playStoreUrl(bundleId);
  let res;
  try {
    res = await axios.get(`${canonicalUrl}&hl=en&gl=US`, {
      timeout: REQUEST_TIMEOUT_MS,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; CampaignAppLookup/1.0; +https://mraket.io)",
      },
    });
  } catch (e) {
    // 404 => app does not exist for this package name.
    if (e.response && e.response.status === 404) return null;
    throw e;
  }

  const $ = cheerio.load(res.data);
  const clean = (s) =>
    isUndefinedOrNull(s)
      ? null
      : s.replace(/\s*-\s*Apps on Google Play\s*$/i, "").trim();

  const title =
    clean($('meta[property="og:title"]').attr("content")) ||
    clean($("title").first().text());

  // No title => not a real app page.
  if (isUndefinedOrNull(title) || title === "") return null;

  const iconUrl = $('meta[property="og:image"]').attr("content") || null;
  const description =
    $('meta[property="og:description"]').attr("content") ||
    $('meta[name="description"]').attr("content") ||
    null;

  return {
    platform: PLATFORM.ANDROID,
    store: "play_store",
    bundleId,
    appId: bundleId,
    title,
    url: canonicalUrl,
    iconUrl,
    developer: null,
    category: null,
    rating: null,
    ratingCount: null,
    price: null,
    version: null,
    description,
  };
};

/**
 * Look up an app by its bundle id / package name on the App Store or Play Store.
 * @param {Object} p
 * @param {string} p.bundleId  e.g. "com.whatsapp" (Android), "net.whatsapp.WhatsApp" or "id1495077102" (iOS)
 * @param {string} [p.platform] "ios" | "android"; if omitted, both stores are tried.
 * @param {string} [p.country]  iOS storefront (e.g. "us", "gb"); if omitted, busiest storefronts are swept.
 * @returns normalized app detail object.
 */
const lookupApp = async ({ bundleId, platform, country } = {}) => {
  if (isUndefinedOrNull(bundleId) || `${bundleId}`.trim() === "") {
    throw new Error("bundleId is required");
  }
  const id = `${bundleId}`.trim();

  if (platform === PLATFORM.IOS) {
    const r = await lookupIos(id, country);
    if (!r) throw new Error("App not found on the App Store for bundleId " + id);
    return r;
  }

  if (platform === PLATFORM.ANDROID) {
    const r = await lookupAndroid(id);
    if (!r)
      throw new Error("App not found on the Play Store for bundleId " + id);
    return r;
  }

  // Platform not specified: try the App Store first, then the Play Store.
  const ios = await lookupIos(id, country).catch(() => null);
  if (ios) return ios;

  // A numeric Apple track id is never a Play Store package name.
  if (asAppleTrackId(id)) {
    throw new Error("App not found on the App Store for id " + id);
  }

  const android = await lookupAndroid(id).catch(() => null);
  if (android) return android;

  throw new Error(
    "App not found on the App Store or Play Store for bundleId " + id
  );
};

module.exports = { lookupApp, PLATFORM };
