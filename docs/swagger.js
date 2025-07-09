// docs/swagger.js
import swaggerJSDoc from 'swagger-jsdoc';
import { allPaths } from './index.js';

export default swaggerJSDoc({
  definition: {
    openapi: '3.0.0',
    info: { 
      title: 'Jarayid API', 
      version: '1.0.0',
      description: 'A comprehensive API for managing news categories and user authentication',
      contact: {
        name: 'API Support',
        email: 'support@jarayid.com'
      }
    },
    servers: [{ 
      url: '/api',
      description: 'Development server'
    }],
    tags: [
      {
        name: 'Users',
        description: 'User authentication and profile management endpoints'
      },
      {
        name: 'Categories',
        description: 'News category management endpoints (Admin access required for modifications)'
      }
    ]
  },
  // Use centralized path configuration
  apis: allPaths
});