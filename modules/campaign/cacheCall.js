const campaignModel = require("./model");
const { isUndefinedOrNull } = require("../../utils/validators");
const { RedisCacheKey } = require("../../connection/redis");

require("dotenv").config();


const getCampaignByIdCacheKey = (id) => {
    return `getCampaignByIdCacheKey:${id}`;
}

const campaignCacheCallService = {
  getCampaignById: async (id) => {
    const key = getCampaignByIdCacheKey(id);
    let data = await RedisCacheKey.getValue(key);
    if (isUndefinedOrNull(data)) {
        data = await campaignModel.findById(id);
        if (!isUndefinedOrNull(data)) {
            await RedisCacheKey.setValueForTime(key, JSON.stringify(data));
        }
    } else {
        data = JSON.parse(data);
    }
    return data;
  },


};

module.exports = campaignCacheCallService;
