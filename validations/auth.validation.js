const Joi = require('joi');

// Standard Password Rule: Min 8 chars, at least one letter and one number
const passwordPattern = Joi.string()
    .min(8)
    .max(30)
    .regex(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/)
    .required();

const loginSchema = Joi.object({
    email: Joi.string().email().lowercase().trim().required()
        .messages({ 'string.email': 'Please provide a valid email address' }),
    password: Joi.string().required() // We don't need regex for login, just presence
});

const registerSchema = Joi.object({
    email: Joi.string().email().lowercase().trim().required(),
    password: passwordPattern
        .messages({
            'string.pattern.base': 'Password must be at least 8 characters long and contain at least one letter and one number.'
        }),
});

module.exports = {
    loginSchema,
    registerSchema
};