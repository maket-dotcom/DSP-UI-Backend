module.exports = {
  ACTIONS: {
    VIEW: "view",
    CREATE: "create",
    UPDATE: "update",
    DELETE: "delete",
    APPROVE: "approve", // campaign: approve / reject what networks submit
  },

  RESOURCES: {
    CAMPAIGN: "campaign",
    MEDIA: "media",
    REPORT: "report",
    USER: "user",
    ORGANIZATION: "organization",
    PAYOUT: "payout",
    WALLET: "wallet",
    NETWORK: "network",
  },

  STATUS: {
    ACTIVE: "active",
    INACTIVE: "inactive",
  },
};
