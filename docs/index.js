// Central configuration for all schema documentation files
// This file exports the paths to all schema files for swagger-jsdoc

export const schemaPaths = [
    './docs/userSchemas.js',
    './docs/categorySchemas.js', 
    './docs/rssFeedSchemas.js',
    './docs/articleSchemas.js',
    './docs/commentSchemas.js',
    './docs/commonSchemas.js'
];

export const routePaths = [
    './routes/**/*.js'
];

// Combined paths for swagger-jsdoc
export const allPaths = [
    ...schemaPaths,
    ...routePaths
];

export default {
    schemaPaths,
    routePaths,
    allPaths
};
