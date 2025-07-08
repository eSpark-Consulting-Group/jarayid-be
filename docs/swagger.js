// docs/swagger.js
import swaggerJSDoc from 'swagger-jsdoc';

export default swaggerJSDoc({
  definition: {
    openapi: '3.0.0',
    info: { title: 'Jarayid API', version: '1.0.0' },
    servers: [{ url: '/api' }]
  },
  // tell swagger-jsdoc where to look for JSDoc comments
  apis: ['./routes/**/*.js']
});