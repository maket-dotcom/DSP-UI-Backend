const _ = require("lodash");
const { Logger } = require("../logger");
const { isUndefinedOrNull } = require("../utils/validators");

const execute = (func) => {
  return async (req, res, next) => {
    const startTime = Date.now();
    const apiPath = req.path;
    let message = "";
    try {
      const result = await func(req, res);
      const endTime = Date.now();
      const duration = endTime - startTime;
      message += `| API -> ${apiPath} | TIME -> ${duration}ms `;
      if (req?.user?.user_id) message += `| USER -> ${req?.user?.user_id} |`;
      Logger.info(message);
      if (!isUndefinedOrNull(result.REDIRECT_TO)) {
        const redirectUrl = result.REDIRECT_TO;
        return res.redirect(redirectUrl);
      }
      return res.status(200).send({ status: 200, data: result });
    } catch (e) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      message += `| API -> ${apiPath} | TIME -> ${duration}ms | ERROR -> ${e.message} |`;
      Logger.error(message);
      return res.status(400).send({ status: 400, error: e.message });
    }
  };
};

module.exports = execute;
