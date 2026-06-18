import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'FameHub LMS API',
      version: '3.0.0',
      description: 'Complete Learning Management System REST API — Phase 3'
    },
    servers: [{ url: 'http://localhost:5000', description: 'Development Server' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['admin', 'teacher', 'student'] },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            isActive: { type: 'boolean' }
          }
        },
        Course: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            description: { type: 'string' },
            teacherId: { type: 'string' },
            isArchived: { type: 'boolean' }
          }
        },
        Assignment: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            dueDate: { type: 'string', format: 'date-time' },
            maxMarks: { type: 'integer' }
          }
        }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  apis: ['./routes/*.js', './controllers/*.js']
};

export const swaggerSpec = swaggerJsdoc(options);
export default swaggerSpec;
