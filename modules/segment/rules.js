// How each bid-request segment in the India workbook is decided from the
// request, keyed by its workbook name. The bid engine reads `rule`: every
// field that is set must match (a segment is one AND of conditions), and a
// line item matches when the device is in any of its included segments.
//
// Rule fields (all lower-case strings):
//   country          ISO-2 the geo fields apply to (geo.country, alpha-2 or -3)
//   regions          geo.region: ISO 3166-2 codes without "IN-" and names
//   cities           geo.city names, with the spellings exchanges use
//   languages        device.language primary subtag (ISO 639-1)
//   os               "android" | "ios"
//   osvMin           lowest device.osv
//   makes            device.make; "xiaomi" also matches "xiaomi inc"
//   carriers         device.carrier contains the token (tokens under 3
//                    letters must equal it: "vi")
//   connectionTypes  OpenRTB connectiontype (2 Wi-Fi, 7 5G)
//   deviceTypes      OpenRTB devicetype (5 tablet)
//
// Segments of a request category that can't be decided from the request map
// to { reason } instead and stay "needs data".

const IN = "IN";

const STATES = {
  "Uttar Pradesh": ["up", "uttar pradesh"],
  Maharashtra: ["mh", "maharashtra"],
  "West Bengal": ["wb", "west bengal"],
  "Tamil Nadu": ["tn", "tamil nadu"],
  Bihar: ["br", "bihar"],
  Karnataka: ["ka", "karnataka"],
  "Madhya Pradesh": ["mp", "madhya pradesh"],
  Rajasthan: ["rj", "rajasthan"],
  Gujarat: ["gj", "gujarat"],
  "Andhra Pradesh": ["ap", "andhra pradesh"],
  Telangana: ["tg", "ts", "telangana"],
  "Delhi (NCT)": ["dl", "delhi", "nct of delhi", "national capital territory of delhi"],
  Odisha: ["od", "or", "odisha", "orissa"],
  Kerala: ["kl", "kerala"],
  Jharkhand: ["jh", "jharkhand"],
  Punjab: ["pb", "punjab"],
  Assam: ["as", "assam"],
  Haryana: ["hr", "haryana"],
  Chhattisgarh: ["ct", "cg", "chhattisgarh"],
  "Jammu & Kashmir": ["jk", "jammu and kashmir", "jammu & kashmir"],
  Uttarakhand: ["ut", "uk", "uttarakhand", "uttaranchal"],
  "Northeast States (excl. Assam)": [
    "ar", "arunachal pradesh", "mn", "manipur", "ml", "meghalaya", "mz", "mizoram",
    "nl", "nagaland", "sk", "sikkim", "tr", "tripura",
  ],
  "Himachal Pradesh": ["hp", "himachal pradesh"],
  Goa: ["ga", "goa"],
};

const states = (...names) => names.flatMap((n) => STATES[n]);

const METROS = {
  "Delhi NCR": ["delhi", "new delhi", "noida", "greater noida", "gurgaon", "gurugram", "ghaziabad", "faridabad"],
  "Mumbai MMR": [
    "mumbai", "bombay", "thane", "navi mumbai", "kalyan", "dombivli", "kalyan-dombivli", "vasai", "virar",
    "vasai-virar", "bhiwandi", "mira bhayandar", "mira-bhayandar", "panvel", "ulhasnagar",
  ],
  Bengaluru: ["bengaluru", "bangalore"],
  Hyderabad: ["hyderabad", "secunderabad"],
  Kolkata: ["kolkata", "calcutta", "howrah", "bidhannagar", "salt lake city"],
  Chennai: ["chennai", "madras"],
  Pune: ["pune", "pimpri-chinchwad", "pimpri chinchwad", "pimpri", "chinchwad"],
  Ahmedabad: ["ahmedabad", "amdavad"],
};

// Y-class (tier 2) cities from the government's HRA city classification,
// minus the towns already inside the top 8 metros above.
const TIER2 = [
  "agra", "ajmer", "aligarh", "amravati", "amritsar", "asansol", "aurangabad", "chhatrapati sambhajinagar",
  "bareilly", "belgaum", "belagavi", "bhavnagar", "bhilai", "bhopal", "bhubaneswar", "bikaner", "bilaspur",
  "bokaro", "bokaro steel city", "chandigarh", "coimbatore", "cuttack", "dehradun", "dhanbad", "durgapur",
  "erode", "firozabad", "gorakhpur", "gulbarga", "kalaburagi", "guntur", "gwalior", "guwahati", "hubli",
  "dharwad", "hubballi", "indore", "jabalpur", "jaipur", "jalandhar", "jammu", "jamnagar", "jamshedpur",
  "jhansi", "jodhpur", "kakinada", "kannur", "kanpur", "karnal", "kochi", "cochin", "kolhapur", "kollam",
  "kozhikode", "calicut", "kurnool", "lucknow", "ludhiana", "madurai", "malappuram", "mangalore",
  "mangaluru", "mathura", "meerut", "moradabad", "mysore", "mysuru", "nagpur", "nanded", "nashik",
  "nellore", "patna", "pondicherry", "puducherry", "prayagraj", "allahabad", "raipur", "rajahmundry",
  "rajkot", "ranchi", "ratlam", "rourkela", "salem", "sangli", "shimla", "siliguri", "solapur", "srinagar",
  "surat", "thanjavur", "thiruvananthapuram", "trivandrum", "thrissur", "tiruchirappalli", "trichy",
  "tirunelveli", "tiruppur", "ujjain", "vadodara", "baroda", "varanasi", "vellore", "vijayawada",
  "visakhapatnam", "vizag", "warangal",
];

const city = (...names) => ({ country: IN, cities: names });
const region = (...codes) => ({ country: IN, regions: codes });
const lang = (code) => ({ languages: [code] });
const make = (...makes) => ({ makes });
const carrier = (...carriers) => ({ carriers });

const JIO = ["jio", "reliance"];
const AIRTEL = ["airtel", "bharti"];

const REQUEST_RULES = {
  ...Object.fromEntries(Object.entries(STATES).map(([name, codes]) => [name, { rule: region(...codes) }])),

  "Top 8 Metros Combined": { rule: city(...Object.values(METROS).flat()) },
  ...Object.fromEntries(Object.entries(METROS).map(([name, cities]) => [name, { rule: city(...cities) }])),
  Jaipur: { rule: city("jaipur") },
  Lucknow: { rule: city("lucknow") },
  Surat: { rule: city("surat") },
  Indore: { rule: city("indore") },
  Bhopal: { rule: city("bhopal") },
  "Chandigarh Tricity": { rule: city("chandigarh", "mohali", "sahibzada ajit singh nagar", "panchkula") },
  Kochi: { rule: city("kochi", "cochin", "ernakulam") },
  "Tier 2 Cities": { rule: city(...TIER2) },
  "Tier 3+ Towns": { reason: "Needs a town-tier lookup for every city and town" },
  "Rural India": { reason: "Needs a rural / urban lookup; the request's city is often blank outside towns" },
  "Hindi Heartland (HSM)": {
    rule: region(...states(
      "Uttar Pradesh", "Bihar", "Madhya Pradesh", "Rajasthan", "Haryana", "Delhi (NCT)",
      "Jharkhand", "Chhattisgarh", "Uttarakhand", "Himachal Pradesh",
    )),
  },
  "South India": {
    rule: region(...states("Andhra Pradesh", "Telangana", "Karnataka", "Tamil Nadu", "Kerala"), "py", "puducherry"),
  },

  Hindi: { rule: lang("hi") },
  "English-First": { rule: lang("en") },
  Bengali: { rule: lang("bn") },
  Marathi: { rule: lang("mr") },
  Telugu: { rule: lang("te") },
  Tamil: { rule: lang("ta") },
  Gujarati: { rule: lang("gu") },
  Kannada: { rule: lang("kn") },
  Malayalam: { rule: lang("ml") },
  Odia: { rule: lang("or") },
  Punjabi: { rule: lang("pa") },
  Assamese: { rule: lang("as") },
  "Hinglish Content Consumers": { reason: "Needs content history; the device language can't tell" },
  "Bilingual (Regional + English)": { reason: "Needs content history; the device language can't tell" },
  "Bhojpuri Content Consumers": { reason: "Needs content history; devices rarely set Bhojpuri as their language" },

  "Android Users": { rule: { os: "android" } },
  "iOS Users": { rule: { os: "ios" } },
  "Android 14+ Devices": { rule: { os: "android", osvMin: "14" } },
  "Xiaomi / Redmi / Poco": { rule: make("xiaomi", "redmi", "poco") },
  Samsung: { rule: make("samsung") },
  "Vivo / iQOO": { rule: make("vivo", "iqoo") },
  Oppo: { rule: make("oppo") },
  Realme: { rule: make("realme") },
  "Infinix / Tecno / itel": { rule: make("infinix", "tecno", "itel", "transsion") },
  Motorola: { rule: make("motorola", "moto") },
  OnePlus: { rule: make("oneplus") },
  "Lava & Indian Brands": { rule: make("lava", "micromax", "karbonn", "intex") },
  "Nothing / CMF": { rule: make("nothing", "cmf") },
  "Tablet Users": { rule: { deviceTypes: [5] } },
  "Apple iPhone 15 & Newer": { reason: "Needs a device model lookup; most requests only say \"iPhone\"" },
  "Phones under ₹10,000": { reason: "Needs a device model → price lookup" },
  "Phones ₹10,000–20,000": { reason: "Needs a device model → price lookup" },
  "Phones ₹20,000–35,000": { reason: "Needs a device model → price lookup" },
  "Phones ₹35,000–60,000": { reason: "Needs a device model → price lookup" },
  "Phones ₹60,000+": { reason: "Needs a device model → price lookup" },
  "5G-Capable Devices": { reason: "Needs a device model lookup (5G support)" },
  "Low-RAM Devices (≤4GB)": { reason: "Needs a device model lookup (RAM)" },
  "New Device (activated last 90 days)": { reason: "Needs device history (when we first saw it)" },
  "Connected TV Households": { reason: "Needs a household graph linking phones to TVs" },

  "Jio Subscribers": { rule: carrier(...JIO) },
  "Airtel Subscribers": { rule: carrier(...AIRTEL) },
  "Vi (Vodafone Idea) Subscribers": { rule: carrier("vodafone", "idea", "vi") },
  "BSNL Subscribers": { rule: carrier("bsnl", "cellone") },
  "Jio 5G Users": { rule: { ...carrier(...JIO), connectionTypes: [7] } },
  "Airtel 5G Users": { rule: { ...carrier(...AIRTEL), connectionTypes: [7] } },
  "Wi-Fi-Primary Users": { rule: { connectionTypes: [2] }, note: "Matches devices on Wi-Fi when the ad is requested" },
  "Prepaid Users": { reason: "Not in the bid request; needs a telecom data partner" },
  "Postpaid Users": { reason: "Not in the bid request; needs a telecom data partner" },
  "Dual-SIM Active Users": { reason: "Not in the bid request; needs a telecom data partner" },
  "Home Wi-Fi / Broadband Users": { reason: "Needs an IP → ISP lookup" },
  "JioFiber / AirFiber Users": { reason: "Needs an IP → ISP lookup" },
  "Heavy Data Users (2GB+/day)": { reason: "Needs data-usage history" },
  "Online Recharge App Users": { reason: "Needs app-usage history" },
  "International Roaming / NRI-Linked": { reason: "Not in the bid request" },
};

// Workbook segments we don't offer whatever the data: close to a religion
// proxy, or likely to reach children on a shared device.
const NOT_OFFERED = {
  "Devotional Content Viewers": "Close to a religion proxy; left out until legal review",
  "Devotional / Bhajan Listeners": "Close to a religion proxy; left out until legal review",
  "Devotional & Spiritual": "Close to a religion proxy; left out until legal review",
  "Kids Games (parent devices)": "Likely to reach children on a shared device",
  "Kids Content (parent devices)": "Likely to reach children on a shared device",
  "Kids Early Learning": "Likely to reach children on a shared device",
};

// IAB Audience Taxonomy 1.1 branches we don't let line items target: health
// conditions, religion, politics, real-money gaming. A node is left out when
// its own name matches (or it is one of the roots below), and so is
// everything under it.
const IAB_NOT_OFFERED_ROOTS = {
  466: "Health conditions are sensitive data", // Interest | Medical Health
  550: "Health conditions are sensitive data", // Interest | Pharmaceuticals, Conditions, and Symptoms
  1555: "Health conditions are sensitive data", // Purchase Intent | Pharmaceuticals, Conditions, and Symptoms
};
const IAB_NOT_OFFERED_WORDS = [
  [/relig|spiritual/i, "Religion is sensitive data"],
  [/^(politics|political|elections?)\b/i, "Political views are sensitive data"],
  [/gambl|casino|betting|lotter|poker|fantasy sport/i, "Real-money gaming can't be advertised in India"],
  [/sexual|lgbt/i, "Sexual orientation is sensitive data"],
];

module.exports = { REQUEST_RULES, NOT_OFFERED, IAB_NOT_OFFERED_ROOTS, IAB_NOT_OFFERED_WORDS };
