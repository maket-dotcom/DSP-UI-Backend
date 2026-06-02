const { isUndefinedOrNull } = require("../../validators");
const axios = require("axios");

require("dotenv").config();


const pumbleNotification = async (data) => {
  const webhookUrl = data.url;
  if (isUndefinedOrNull(webhookUrl)) {
    console.error('❌ Failed to send Pumble notification: webhook url in not define');
  }
  const payload = {
    text: data.message,
  };
  try {
    const response = await axios.post(webhookUrl, payload);
    console.log('✅ Pumble notification sent:', response.status);
  } catch (error) {
    console.error('❌ Failed to send Pumble notification:', error.message);
  }
};


module.exports = {
    pumbleNotification
};