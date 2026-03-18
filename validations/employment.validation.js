const Joi = require('joi');

const employmentInfoSchema = Joi.object({
    // Status must match your UI dropdown exactly
    EmploymentStatus: Joi.string()
        .valid('Salaried', 'Self-Employed', 'Unemployed')
        .required()
        .messages({ 'any.only': 'Please select a valid employment status.' }),

    // Employer Name: Required ONLY if Salaried.
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

    // Compensation Type: Required if not Unemployed
    CompensationType: Joi.string()
        .valid('Salary', 'Hourly')
        .when('EmploymentStatus', {
            is: Joi.valid('Salaried', 'Self-Employed'),
            then: Joi.required(),
            otherwise: Joi.allow('', null).optional(),
        })
        .messages({ 'any.required': 'Please select a compensation type.' }),

    // Employer Address Fields
    EmployerAddress: Joi.string()
        .trim()
        .when('EmploymentStatus', {
            is: Joi.valid('Salaried', 'Self-Employed'),
            then: Joi.required(),
            otherwise: Joi.allow('', null).optional(),
        })
        .messages({ 'any.required': 'Employer address is required.' }),

    EmployerCity: Joi.string()
        .trim()
        .when('EmploymentStatus', {
            is: Joi.valid('Salaried', 'Self-Employed'),
            then: Joi.required(),
            otherwise: Joi.allow('', null).optional(),
        })
        .messages({ 'any.required': 'Employer city is required.' }),

    EmployerState: Joi.string()
        .trim()
        .when('EmploymentStatus', {
            is: Joi.valid('Salaried', 'Self-Employed'),
            then: Joi.required(),
            otherwise: Joi.allow('', null).optional(),
        })
        .messages({ 'any.required': 'Employer state is required.' }),

    EmployerZipCode: Joi.string()
        .trim()
        .regex(/^[0-9]{5}$/)
        .when('EmploymentStatus', {
            is: Joi.valid('Salaried', 'Self-Employed'),
            then: Joi.required(),
            otherwise: Joi.allow('', null).optional(),
        })
        .messages({
            'any.required': 'Zip code is required.',
            'string.pattern.base': 'Zip code must be 5 digits.'
        }),

    // Years at employer: 0 to 60 years
    YearsAtEmployer: Joi.number()
        .min(1)
        .max(60)
        .required()
        .messages({
            'number.min': 'Years at employer must be at least 1.',
            'number.max': 'Please enter a valid number of years (max 60).'
        }),

    // Monthly income: Must be positive, allowed up to 2 decimal places
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