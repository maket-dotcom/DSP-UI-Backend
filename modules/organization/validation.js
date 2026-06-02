const Joi = require('joi');

const update = Joi.object({
	logoUrl: Joi.string().optional(),
    logoUrlId: Joi.string().optional(),
	themeColor: Joi.string().optional(),
});

module.exports = {
    update,
};
