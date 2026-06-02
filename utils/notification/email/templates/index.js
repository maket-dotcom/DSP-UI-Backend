const otpVerifyEmail = require('./otpVerifyEmail');
const register = require('./register');
const notifyOperations = require('./notifyOperations');
const notifyStageUpdate = require('./notifySupplyTeamForStageUpdate');
const notifyAffiliateforCampaignAndPidsInfo = require('./notifyAffiliateforCampaignAndPidsInfo');


module.exports = {
    otpVerifyEmail,
    register,
    notifyOperations,
    notifyStageUpdate,
    notifyAffiliateforCampaignAndPidsInfo
};
