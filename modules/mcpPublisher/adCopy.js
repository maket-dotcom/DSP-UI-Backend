const { isUndefinedOrNull } = require("../../utils/validators");

// Sponsored copy is shown inside an AI tool result. It must describe the offer
// and never address the model — instructions aimed at the assistant read as
// prompt injection and get the publisher's server flagged by hosts.
const MODEL_DIRECTED_PATTERNS = [
  /\bignore\b.*\b(instruction|previous|above|prompt)s?\b/i,
  /\b(you|assistant|ai|model|llm|claude|chatgpt|gpt)\s+(must|should|need to|have to)\b/i,
  /\b(tell|inform|remind|recommend to)\s+the\s+user\b/i,
  /\b(always|must)\s+(mention|recommend|include|say)\b/i,
  /\bsystem\s*prompt\b/i,
  /^\s*(system|assistant|user)\s*:/im,
  /<\/?[a-z][^>]*>/i, // markup / tags
];

const URL_IN_TEXT = /(https?:\/\/|www\.)\S+/i;

const hostnameOf = (url) => {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch (e) {
    return null;
  }
};

// Validates an MCP creative and fills displayDomain. Throws on anything that
// must not serve. `matchDomain: false` lets super admin show the brand's
// domain for MMP tracking links (app.appsflyer.com → brand.com).
const normalizeCreative = (creative, { matchDomain = true } = {}) => {
  const host = hostnameOf(creative.destinationUrl);
  if (isUndefinedOrNull(host)) {
    throw new Error("destinationUrl must be a valid URL");
  }

  for (const field of ["advertiser", "title", "description", "cta"]) {
    const value = creative[field];
    if (isUndefinedOrNull(value)) continue;
    if (MODEL_DIRECTED_PATTERNS.some((rx) => rx.test(value))) {
      throw new Error(
        `creative.${field} looks like an instruction to the AI assistant. Sponsored copy must only describe the offer.`
      );
    }
    if (URL_IN_TEXT.test(value)) {
      throw new Error(`creative.${field} must not contain links; use destinationUrl`);
    }
  }

  const displayDomain = (creative.displayDomain || host).toLowerCase().replace(/^www\./, "");
  if (matchDomain && host !== displayDomain && !host.endsWith(`.${displayDomain}`)) {
    throw new Error(`displayDomain (${displayDomain}) must match the destinationUrl host (${host})`);
  }

  return { ...creative, displayDomain };
};

module.exports = { normalizeCreative, hostnameOf };
