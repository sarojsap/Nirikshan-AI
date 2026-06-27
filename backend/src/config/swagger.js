import swaggerUi from 'swagger-ui-express';

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Nirikshan-AI API Documentation',
    version: '1.0.0',
    description: 'API for Nirikshan-AI video surveillance and incident tracking system.',
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Local development server',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token in the format: <token_value>',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string' },
          role: { type: 'string', enum: ['ADMIN', 'OPERATOR'] },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Camera: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          location: { type: 'string' },
          rtspUrl: { type: 'string' },
          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'MAINTENANCE'] },
          crowdThreshold: { type: 'integer', default: 3 },
          restrictedPolygon: { type: 'object', nullable: true },
          restrictedStartTime: { type: 'string', format: 'time', nullable: true },
          restrictedEndTime: { type: 'string', format: 'time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Incident: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          type: { type: 'string', enum: ['PERSON_DETECTED', 'INTRUSION', 'CROWD', 'RESTRICTED_AREA'] },
          description: { type: 'string', nullable: true },
          severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
          imageUrl: { type: 'string', nullable: true },
          timestamp: { type: 'string', format: 'date-time' },
          camera: { $ref: '#/components/schemas/Camera' },
        },
      },
    },
  },
  security: [
    {
      BearerAuth: [],
    },
  ],
  paths: {
    '/api/auth/register': {
      post: {
        summary: 'Register a new user',
        security: [], // No authentication required
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string' },
                  role: { type: 'string', enum: ['ADMIN', 'OPERATOR'], default: 'OPERATOR' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'User registered successfully',
          },
          400: {
            description: 'Invalid input or user already exists',
          },
        },
      },
    },
    '/api/auth/login': {
      post: {
        summary: 'Login and get a JWT token',
        security: [], // No authentication required
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    data: {
                      type: 'object',
                      properties: {
                        user: { $ref: '#/components/schemas/User' },
                        token: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: {
            description: 'Invalid credentials',
          },
        },
      },
    },
    '/api/cameras': {
      get: {
        summary: 'Get all cameras',
        responses: {
          200: {
            description: 'List of cameras',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Camera' },
                },
              },
            },
          },
        },
      },
      post: {
        summary: 'Add a new camera (Admin only)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'location', 'rtspUrl'],
                properties: {
                  name: { type: 'string' },
                  location: { type: 'string' },
                  rtspUrl: { type: 'string', description: 'Stream source URL, or 0 for local webcam' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Camera created successfully',
          },
          400: {
            description: 'Missing required fields',
          },
          403: {
            description: 'Access denied. Admins only.',
          },
        },
      },
    },
    '/api/cameras/{id}/settings': {
      put: {
        summary: 'Update camera settings (Admin only)',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  crowdThreshold: { type: 'integer' },
                  restrictedPolygon: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        x: { type: 'integer' },
                        y: { type: 'integer' },
                      },
                    },
                    description: 'Array of points representing the intrusion zone polygon',
                  },
                  restrictedStartTime: { type: 'string', description: 'Format: HH:MM:SS' },
                  restrictedEndTime: { type: 'string', description: 'Format: HH:MM:SS' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Settings updated successfully',
          },
          400: {
            description: 'Invalid input',
          },
          403: {
            description: 'Access denied. Admins only.',
          },
        },
      },
    },
    '/api/incidents': {
      get: {
        summary: 'Get all incidents (Paginated)',
        parameters: [
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', default: 1 },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 10 },
          },
        ],
        responses: {
          200: {
            description: 'Paginated list of incidents',
          },
        },
      },
      post: {
        summary: 'Log a new incident (Called by AI service)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['type', 'cameraId'],
                properties: {
                  type: { type: 'string', enum: ['PERSON_DETECTED', 'INTRUSION', 'CROWD', 'RESTRICTED_AREA'] },
                  description: { type: 'string' },
                  severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' },
                  imageUrl: { type: 'string' },
                  cameraId: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Incident logged successfully',
          },
        },
      },
    },
    '/api/analytics/summary': {
      get: {
        summary: 'Get dashboard summary metrics',
        responses: {
          200: {
            description: 'Summary dashboard metrics',
          },
        },
      },
    },
  },
};

export const serveSwagger = swaggerUi.serve;
export const setupSwagger = swaggerUi.setup(swaggerDocument);
