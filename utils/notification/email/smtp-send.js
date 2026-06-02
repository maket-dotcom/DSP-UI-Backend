require("dotenv").config();
const SibApiV3Sdk = require("@getbrevo/brevo");
const key = process.env.BREVO_API_KEY;
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
const { apiKey } = apiInstance.authentications;
apiKey.apiKey = key;
const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
const {
  otpVerifyEmail,
  register,
  notifyOperations,
  notifyStageUpdate,
  notifyAffiliateforCampaignAndPidsInfo,
} = require("./templates/index");

const nodemailer = require("nodemailer");

// Create a transporter using SMTP
const getTransporter = (info) => {
  const transporter = nodemailer.createTransport({
    host: info.host, // Replace with your SMTP server
    port: 587, // Common SMTP ports: 465 (SSL), 587 (TLS)
    secure: false, // Use true for port 465, false for 587
    auth: {
      user: info.user, // Replace with your email
      pass: info.pass, // Replace with your email password
    },
  });
  return transporter;
};

// sender info includes (secured info collection data)
// reciver info have emails array of recivers
// mail body have { htmlContent, subject }
sendCall = async ({ senderInfo, reciverInfo, mailBody }) => {
  // Email options
  const mailOptions = {
    from: senderInfo.email, // Sender address
    to: [...reciverInfo.emails], // List of receivers
    cc: reciverInfo?.ccEmails || [],
    subject: mailBody.subject, // Subject line
    html: mailBody.body, // HTML body
    attachments: mailBody?.attachments || [],
  };

  const transporter = getTransporter(senderInfo);

  // Send the email
  try {
    const info = await new Promise((resolve, reject) => {
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) return reject(error);
        resolve(info);
      });
    });

    console.log("Email sent:", info.response);
  } catch (error) {
    console.log("Error:", error);
    throw new Error(
      "Internal Error in sending mail please verify you smtp config"
    );
  }
};

// mail will inject when sales team create campaign
const notifyOperationsTeam = async (data) => {
  const { campaignName, userInfo, campaignLink, senderInfo, reciverInfo } =
    data;
  const { body, subject } = notifyOperations({
    campaignName,
    userInfo,
    campaignLink,
  });
  const mailBody = { subject, body };
  try {
    await sendCall({ senderInfo, reciverInfo, mailBody });
  } catch (e) {}
};

// mail will inject when ops team will update stage of campaign
const notifySupplyTeamForStageUpdate = async (data) => {
  const {
    campaignName,
    userInfo,
    campaignLink,
    senderInfo,
    reciverInfo,
    remark,
    newStage,
  } = data;
  const { body, subject } = notifyStageUpdate({
    campaignName,
    userInfo,
    campaignLink,
    remark,
    newStage,
  });
  const mailBody = { subject, body };
  try {
    await sendCall({ senderInfo, reciverInfo, mailBody });
  } catch (e) {}
};

const notifyAffiliate = async (data) => {
  const { senderInfo, reciverInfo, camp, affInfos } = data;
  const { body, subject } = notifyAffiliateforCampaignAndPidsInfo({
    senderInfo,
    reciverInfo,
    camp,
    affInfos,
  });
  const mailBody = { subject, body };
  await sendCall({ senderInfo, reciverInfo, mailBody });
};

const notifyAffiliateVaiCustomMail = async (data) => {
  const {
    senderInfo,
    reciverInfo,
    subjectTemplate,
    bodyTemplate,
    attachments,
  } = data;
  const mailBody = {
    subject: subjectTemplate,
    body: bodyTemplate,
    attachments,
  };
  await sendCall({ senderInfo, reciverInfo, mailBody });
};

module.exports = {
  notifyOperationsTeam,
  notifySupplyTeamForStageUpdate,
  notifyAffiliate,
  notifyAffiliateVaiCustomMail,
};
