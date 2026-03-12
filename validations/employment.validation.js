const Joi = require('joi');

const employmentInfoSchema = Joi.object({
    EmploymentStatus: Joi.string()
        .valid('Salaried', 'Self-Employed', 'Unemployed')
        .required()
        .messages({ 'any.only': 'Please select a valid employment status.' }),

    EmployerName: Joi.string()
        .trim()
        .regex(/^[a-zA-Z\s-]+$/)
        .min(2)
        .max(100)
        .when('EmploymentStatus', {
            is: 'Salaried',
            then: Joi.required(),
            otherwise: Joi.allow('', null).optional(),
        })
        .messages({ 
            'any.required': 'Employer Name is required for salaried employees.',
            'string.pattern.base': 'Employer Name must only contain letters and spaces.'
         }),

    YearsAtEmployer: Joi.number()
        .min(0)
        .max(60)
        .required()
        .messages({
            'number.min': 'Years at employer cannot be negative.',
            'number.max': 'Please enter a valid number of years (max 60).'
        }),

    MonthlyIncome: Joi.number()
        .precision(2)
        .when('EmploymentStatus', {
            is: 'Salaried',
            then: Joi.number().min(20000).required(),
            otherwise: Joi.number().min(0).allow('', null).optional()
        })
        .messages({
            'number.base': 'Monthly income must be a valid number.',
            'number.min': 'Minimum 20,000 of monthly income is required for salaried profiles.',
        }),

    UserId: Joi.string().required(),
});

const getEmploymentParamsSchema = Joi.object({
    borrowerId: Joi.string().required()
});

module.exports = {
    employmentInfoSchema,
    getEmploymentParamsSchema
};