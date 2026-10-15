const { FIELD } = require("../bidModifier/constant");

module.exports = {
  STATUS: {
    ACTIVE: "active",
    DELETED: "deleted",
  },

  // Conditions test the same request attributes as bid modifier terms.
  FIELD,

  MAX_TERMS: 50,
  MAX_CONDITIONS: 10,
};
