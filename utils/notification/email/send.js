require("dotenv").config();
const SibApiV3Sdk = require('@getbrevo/brevo');
const key = process.env.BREVO_API_KEY;
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
const { apiKey } = apiInstance.authentications;
apiKey.apiKey = key;
const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
const { otpVerifyEmail, register } = require('./templates/index');

const sendMail = (data) => {
    const { otp, email } = data;
    const { body, subject } = otpVerifyEmail(otp);

    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = body;
    sendSmtpEmail.sender = { name: 'Harsh Sharma', email: 'team@adsshare.in' };
    sendSmtpEmail.to = [{ email: email }];
    apiInstance.sendTransacEmail(sendSmtpEmail).then((res) => {
        console.log(`API called successfully. Returned data: ${JSON.stringify(res)}`);
    }, (error) => {
        console.error(error);
        throw new Error(`Email sending got failed`);
    });
};

const afterRegisterSendMail = (data) => {
    const { name, email } = data;
    const { body, subject } = register(name);

    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = body;
    sendSmtpEmail.sender = { name: 'Harsh Sharma', email: 'team@adsshare.in' };
    sendSmtpEmail.to = [{ email: email }];
    apiInstance.sendTransacEmail(sendSmtpEmail).then((res) => {
        console.log(`API called successfully. Returned data: ${JSON.stringify(res)}`);
    }, (error) => {
        console.error(error);
        throw new Error(`Email sending got failed`);
    });
};


module.exports = {
    afterRegisterSendMail,
    sendMail
};