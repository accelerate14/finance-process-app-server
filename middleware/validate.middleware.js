// middleware/validate.js
const validate = (schema, property = 'body') => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req[property], { 
            abortEarly: false, 
            allowUnknown: true,
            stripUnknown: true // This removes any "junk" fields the frontend sent
        });

        if (error) {
            const errorMessage = error.details.map(d => d.message).join(', ');
            return res.status(400).json({ success: false, errors: errorMessage });
        }

        // REPLACE the dirty req.body with the clean Joi 'value'
        req[property] = value; 
        next();
    };
};

module.exports = validate;