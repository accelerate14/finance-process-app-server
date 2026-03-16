const Joi = require('joi');

const loanSubmissionSchema = Joi.object({
    UserId: Joi.string().required(),
    RequestedOn: Joi.date().iso().required(),
    BorrowerEmail: Joi.string().email().lowercase().required(),

    RequesterEmailID: Joi.string()
        .email()
        .lowercase()
        .required()
        .messages({
            'string.email': 'A valid requester email address is required',
            'any.required': 'Requester Email ID is required'
        }),

    LoanAmount: Joi.number()
        .positive()
        .min(1000)
        .max(1000000)
        .required()
        .messages({
            'number.min': 'Minimum loan amount is 1,000',
            'number.max': 'Maximum loan amount is 1,000,000',
            'number.base': 'Loan amount must be a number'
        }),

    TermOfLoan: Joi.number()
        .integer()
        .min(3)
        .max(360)
        .required()
        .messages({
            'number.min': 'Minimum tenure is 3 months',
            'number.max': 'Maximum tenure is 360 months',
            'number.base': 'Term must be a number of months'
        }),

    PurposeOfLoan: Joi.string()
        .valid(
            "Personal Loan",
            "Education Loan",
            "Home Loan",
            "Business Loan",
            "Medical Loan"
        )
        .required()
        .messages({
            'any.only': 'Please select a valid loan type from the list',
            'any.required': 'Please select the purpose of the loan'
        }),

    CaseStatus: Joi.string()
        .valid('Pending', 'In Review', 'Approved', 'Rejected', 'SUBMITTED')
        .default('SUBMITTED')
});

const getLoanParamsSchema = Joi.object({
    borrowerId: Joi.string().required()
});

const getLoanByIdSchema = Joi.object({
    loanId: Joi.string().required()
});

module.exports = {
    loanSubmissionSchema,
    getLoanParamsSchema,
    getLoanByIdSchema
};