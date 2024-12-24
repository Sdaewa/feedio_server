const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const { version } = require('../package.json');

// Swagger definition
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Feedio API Documentation',
      version,
      description: 'API documentation for Feedio - Customer Feedback Management Platform',
      license: {
        name: 'Private',
        url: 'https://feedio.app/terms',
      },
      contact: {
        name: 'Feedio Support',
        url: 'https://feedio.app/support',
        email: 'support@feedio.app',
      },
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://api.feedio.app' 
          : `http://localhost:${process.env.PORT || 8080}`,
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
      },
    ],
    components: {
      schemas: {
        User: {
          type: 'object',
          required: ['email', 'password', 'name'],
          properties: {
            id: {
              type: 'string',
              description: 'The auto-generated user ID',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
            },
            password: {
              type: 'string',
              format: 'password',
              minLength: 8,
              description: 'User password (min 8 characters)',
            },
            name: {
              type: 'string',
              description: 'User full name',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'User creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },
        Product: {
          type: 'object',
          required: ['name', 'header', 'content'],
          properties: {
            id: {
              type: 'string',
              description: 'The auto-generated product ID',
            },
            name: {
              type: 'string',
              description: 'Product name',
            },
            header: {
              type: 'string',
              description: 'Product header/title',
            },
            content: {
              type: 'string',
              description: 'Product description/content',
            },
            imageUrl: {
              type: 'string',
              description: 'Product image URL',
            },
            questions: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'List of feedback questions',
            },
          },
        },
        Review: {
          type: 'object',
          required: ['name', 'email', 'feedback', 'rating'],
          properties: {
            id: {
              type: 'string',
              description: 'The auto-generated review ID',
            },
            name: {
              type: 'string',
              description: 'Reviewer name',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Reviewer email',
            },
            feedback: {
              type: 'string',
              description: 'Review content',
            },
            rating: {
              type: 'number',
              minimum: 1,
              maximum: 5,
              description: 'Rating (1-5)',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['fail', 'error'],
              description: 'Error status',
            },
            message: {
              type: 'string',
              description: 'Error message',
            },
            details: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Detailed error information',
            },
          },
        },
      },
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Access token is missing or invalid',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
        ValidationError: {
          description: 'Invalid input data',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
      },
    },
    security: [{
      bearerAuth: [],
    }],
    tags: [
      {
        name: 'Users',
        description: 'User management endpoints',
      },
      {
        name: 'Products',
        description: 'Product management endpoints',
      },
      {
        name: 'Reviews',
        description: 'Review management endpoints',
      },
      {
        name: 'Widgets',
        description: 'Widget management endpoints',
      },
    ],
  },
  apis: [
    './routes/*.js',
    './models/*.js',
  ],
};

const specs = swaggerJsdoc(options);

module.exports = {
  serve: swaggerUi.serve,
  setup: swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Feedio API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      deepLinking: true,
    },
  }),
  specs,
}; 