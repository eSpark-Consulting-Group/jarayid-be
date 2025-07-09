import response from '../utils/response.js';

// Validation middleware factory
const createValidator = (schema) => {
    return (req, res, next) => {
        try {
            const { error } = schema.validate(req.body);
            if (error) {
                return response.error(res, error.details[0].message, 400);
            }
            next();
        } catch (error) {
            response.error(res, 'Validation error', 400);
        }
    };
};

// Factory function to create validation middleware
const createValidationMiddleware = (schemas) => {
    const validate = createValidator;
    
    // Dynamically build middleware for every operation present in each schema
    const middleware = {};
    Object.keys(schemas).forEach(type => {
        middleware[type] = {};
        Object.keys(schemas[type]).forEach(operation => {
            middleware[type][operation] = validate(schemas[type][operation]);
        });
    });

    return middleware;
};

export default createValidationMiddleware;
