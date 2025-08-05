import response from '../utils/response.js';

// Validation middleware factory
const createValidator = (schema, source = 'body') => {
    return (req, res, next) => {
        try {
            const data = source === 'body' ? req.body : 
                        source === 'params' ? req.params : 
                        source === 'query' ? req.query : req.body;
            
            const { error, value } = schema.validate(data);
            if (error) {
                return response.error(res, error.details[0].message, 400);
            }
            
            // Update the request object with validated data
            if (source === 'body') req.body = value;
            else if (source === 'params') req.params = value;
            else if (source === 'query') req.query = value;
            
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
            if (operation === 'params') {
                middleware[type][operation] = validate(schemas[type][operation], 'params');
            } else if (operation === 'query') {
                middleware[type][operation] = validate(schemas[type][operation], 'query');
            } else {
                middleware[type][operation] = validate(schemas[type][operation], 'body');
            }
        });
    });

    return middleware;
};

export default createValidationMiddleware;
