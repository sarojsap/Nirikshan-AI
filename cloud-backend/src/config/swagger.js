import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Nirikshan Cloud API',
      version: '1.0.0',
      description: 'Cloud backend for Nirikshan AI surveillance system',
    },
    servers: [{ url: `/`, description: 'Cloud API' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string', enum: ['SUPER_ADMIN', 'ORG_ADMIN', 'OPERATOR', 'VIEWER'] },
            organizationId: { type: 'string' },
            isActive: { type: 'boolean' },
          },
        },
        Incident: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { type: 'string' },
            description: { type: 'string' },
            severity: { type: 'string' },
            cameraId: { type: 'string' },
            cameraName: { type: 'string' },
            snapshotUrl: { type: 'string' },
            clipUrl: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
            organizationId: { type: 'string' },
            edgeDeviceId: { type: 'string' },
          },
        },
        EdgeDevice: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            status: { type: 'string', enum: ['ONLINE', 'OFFLINE'] },
            version: { type: 'string' },
            lastHeartbeat: { type: 'string', format: 'date-time' },
            config: { type: 'object' },
            organizationId: { type: 'string' },
          },
        },
      },
    },
    paths: {
      '/health': {
        get: {
          summary: 'Health check',
          responses: { 200: { description: 'Service is healthy' } },
        },
      },
      '/api/auth/register': {
        post: {
          summary: 'Register a new user',
          tags: ['Auth'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'name', 'password'],
                  properties: {
                    email: { type: 'string' },
                    name: { type: 'string' },
                    password: { type: 'string' },
                    organizationId: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'User registered' }, 400: { description: 'Validation error' } },
        },
      },
      '/api/auth/login': {
        post: {
          summary: 'Login',
          tags: ['Auth'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: { email: { type: 'string' }, password: { type: 'string' } },
                },
              },
            },
          },
          responses: { 200: { description: 'Login successful' }, 401: { description: 'Invalid credentials' } },
        },
      },
      '/api/auth/forgot-password': {
        post: {
          summary: 'Request password reset',
          tags: ['Auth'],
          requestBody: {
            content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' } } } } },
          },
          responses: { 200: { description: 'Reset link sent if email exists' } },
        },
      },
      '/api/auth/reset-password': {
        post: {
          summary: 'Reset password with token',
          tags: ['Auth'],
          requestBody: {
            content: {
              'application/json': {
                schema: { type: 'object', properties: { token: { type: 'string' }, password: { type: 'string' } } },
              },
            },
          },
          responses: { 200: { description: 'Password reset successful' } },
        },
      },
      '/api/devices': {
        get: {
          summary: 'List edge devices',
          tags: ['Devices'],
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'List of devices' } },
        },
        post: {
          summary: 'Register a new edge device',
          tags: ['Devices'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' } } } } },
          },
          responses: { 201: { description: 'Device registered' } },
        },
      },
      '/api/incidents': {
        get: {
          summary: 'List incidents',
          tags: ['Incidents'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: 'query', name: 'type', schema: { type: 'string' } },
            { in: 'query', name: 'severity', schema: { type: 'string' } },
            { in: 'query', name: 'page', schema: { type: 'integer' } },
            { in: 'query', name: 'limit', schema: { type: 'integer' } },
          ],
          responses: { 200: { description: 'Paginated incident list' } },
        },
      },
      '/api/incidents/summary': {
        get: {
          summary: 'Dashboard summary',
          tags: ['Incidents'],
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Dashboard aggregation data' } },
        },
      },
      '/api/operators': {
        get: {
          summary: 'List operators',
          tags: ['Operators'],
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Operator list' } },
        },
        post: {
          summary: 'Create operator',
          tags: ['Operators'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'email', 'password'],
                  properties: { name: { type: 'string' }, email: { type: 'string' }, password: { type: 'string' } },
                },
              },
            },
          },
          responses: { 201: { description: 'Operator created' } },
        },
      },
      '/api/edge/incidents': {
        post: {
          summary: 'Receive incident from edge device',
          tags: ['Edge'],
          security: [{ apiKeyAuth: [] }],
          responses: { 201: { description: 'Incident saved' } },
        },
      },
      '/api/edge/upload-url/{incidentId}': {
        post: {
          summary: 'Get Cloudinary upload URL for incident media',
          tags: ['Edge'],
          parameters: [{ in: 'path', name: 'incidentId', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Upload URL generated' } },
        },
      },
    },
  },
  apis: [],
};

const spec = swaggerJsdoc(options);

export function setupSwagger(app) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec));
}
