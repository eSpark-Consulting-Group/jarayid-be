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
      },
      {
        name: 'Social Media Links',
        description: 'Social media links management endpoints (Admin access required)'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        SocialMediaLink: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique identifier for the social media link'
            },
            categoryName: {
              type: 'string',
              maxLength: 100,
              description: 'Category name for the social media link',
              example: 'Main Social'
            },
            link: {
              type: 'string',
              format: 'uri',
              maxLength: 500,
              description: 'URL of the social media link',
              example: 'https://facebook.com/yourpage'
            },
            socialMedia: {
              type: 'string',
              enum: ['FACEBOOK', 'TWITTER', 'INSTAGRAM', 'LINKEDIN', 'YOUTUBE', 'TIKTOK', 'SNAPCHAT', 'PINTEREST', 'WHATSAPP', 'TELEGRAM', 'DISCORD', 'REDDIT', 'GITHUB', 'WEBSITE', 'OTHER'],
              description: 'Type of social media platform'
            },
            isActive: {
              type: 'boolean',
              description: 'Whether the social media link is active',
              default: true
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp'
            }
          },
          required: ['id', 'categoryName', 'link', 'socialMedia', 'isActive', 'createdAt', 'updatedAt']
        },
        Pagination: {
          type: 'object',
          properties: {
            currentPage: {
              type: 'integer',
              description: 'Current page number'
            },
            totalPages: {
              type: 'integer',
              description: 'Total number of pages'
            },
            totalCount: {
              type: 'integer',
              description: 'Total number of items'
            },
            hasNext: {
              type: 'boolean',
              description: 'Whether there is a next page'
            },
            hasPrev: {
              type: 'boolean',
              description: 'Whether there is a previous page'
            },
            limit: {
              type: 'integer',
              description: 'Number of items per page'
            }
          }
        }
      }
    }
  },
  // Use centralized path configuration
  apis: allPaths
});