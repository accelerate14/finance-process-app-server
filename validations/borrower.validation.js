const Joi = require('joi');

const eighteenYearsAgo = new Date();
eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);

const eightyYearsAgo = new Date();
eightyYearsAgo.setFullYear(eightyYearsAgo.getFullYear() - 80);

const borrowerProfileSchema = Joi.object({
    FirstName: Joi.string()
        .trim()
        .regex(/^[a-zA-Z\s-]+$/)
        .min(2)
        .max(50)
        .required()
        .messages({ 
            'string.pattern.base': 'First Name must only contain letters.',
            'string.empty': 'First Name is required.' 
        }),

    LastName: Joi.string()
        .trim()
        .regex(/^[a-zA-Z\s-]+$/)
        .min(2)
        .max(50)
        .required()
        .messages({ 
            'string.pattern.base': 'Last Name must only contain letters.',
            'string.empty': 'Last Name is required.' 
        }),

    DateOfBirth: Joi.date()
        .iso()
        .max(eighteenYearsAgo)
        .min(eightyYearsAgo)
        .required()
        .messages({ 
            'date.max': 'You must be at least 18 years old to apply.',
            'date.min': 'Age cannot be more than 80 years.',
            'date.format': 'Date of Birth must be a valid date.',
            'any.required': 'Date of Birth is required.'
        }),

    SSN: Joi.string()
        .regex(/^\d{3}-?\d{2}-?\d{4}$/)
        .required()
        .messages({ 'string.pattern.base': 'SSN must be a valid 9-digit number.' }),

    Address: Joi.string().trim().required(),
    City: Joi.string().trim().required(),
    State: Joi.string().trim().required(),
    
    ZipCode: Joi.string()
        .regex(/^\d{5}$/)
        .required()
        .messages({ 'string.pattern.base': 'ZipCode must be a 5-digit number.' }),

    Email: Joi.string()
        .email({ tlds: { allow: false } })
        .lowercase()
        .max(300)
        .required()
        .messages({ 'string.email': 'Please provide a valid email address.' }),

    profileCompleted: Joi.boolean().required(),
    UserId: Joi.string().required() 
});

const getProfileSchema = Joi.object({
    borrowerId: Joi.string().required()
});

module.exports = {
    borrowerProfileSchema,
    getProfileSchema
};