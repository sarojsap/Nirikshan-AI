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
          name: { type: 'string' },
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
        tags: ['Auth'],
        summary: 'Register a new user',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string' },
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
            description: 'Invalid input or email already exists',
          },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login and get a JWT token',
        security: [],
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
    '/api/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Request a password reset email',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: {
                  email: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'If the email exists, a reset link has been sent.',
          },
        },
      },
    },
    '/api/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Reset password using token from email',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token', 'password'],
                properties: {
                  token: { type: 'string' },
                  password: { type: 'string', minLength: 6 },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Password reset successful',
          },
          400: {
            description: 'Invalid or expired reset token',
          },
        },
      },
    },

    // ========================
    // Operator Management (Admin only)
    // ========================
    '/api/operators': {
      post: {
        tags: ['Operators'],
        summary: 'Create a new operator account (Admin only)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', description: 'Display name of the operator' },
                  email: { type: 'string' },
                  password: { type: 'string', minLength: 6 },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Operator created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    data: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          400: {
            description: 'Invalid input or email already exists',
          },
          403: {
            description: 'Access denied. Admins only.',
          },
        },
      },
      get: {
        tags: ['Operators'],
        summary: 'Get all operators (Admin only)',
        parameters: [
          {
            name: 'search',
            in: 'query',
            schema: { type: 'string' },
            description: 'Search operators by name or email',
          },
        ],
        responses: {
          200: {
            description: 'List of operators',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/User' },
                    },
                  },
                },
              },
            },
          },
          403: {
            description: 'Access denied. Admins only.',
          },
        },
      },
    },
    '/api/operators/{id}': {
      get: {
        tags: ['Operators'],
        summary: 'Get a single operator by ID (Admin only)',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: {
            description: 'Operator details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          404: {
            description: 'Operator not found',
          },
          403: {
            description: 'Access denied. Admins only.',
          },
        },
      },
      put: {
        tags: ['Operators'],
        summary: 'Update operator profile (Admin only)',
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
                  name: { type: 'string' },
                  email: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Operator updated successfully',
          },
          400: {
            description: 'Invalid input or email already exists',
          },
          403: {
            description: 'Access denied. Admins only.',
          },
        },
      },
      delete: {
        tags: ['Operators'],
        summary: 'Delete an operator account (Admin only)',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: {
            description: 'Operator deleted successfully',
          },
          400: {
            description: 'Operator not found or invalid role',
          },
          403: {
            description: 'Access denied. Admins only.',
          },
        },
      },
    },
    '/api/operators/{id}/password': {
      patch: {
        tags: ['Operators'],
        summary: 'Change operator password without verification (Admin only)',
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
                required: ['newPassword'],
                properties: {
                  newPassword: { type: 'string', minLength: 6, description: 'New password for the operator' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Operator password changed successfully',
          },
          400: {
            description: 'Invalid input or operator not found',
          },
          403: {
            description: 'Access denied. Admins only.',
          },
        },
      },
    },

    // ========================
    // Cameras
    // ========================
    '/api/cameras': {
      get: {
        tags: ['Cameras'],
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
        tags: ['Cameras'],
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
        tags: ['Cameras'],
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

    // ========================
    // Incidents
    // ========================
    '/api/incidents': {
      get: {
        tags: ['Incidents'],
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
        tags: ['Incidents'],
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

    // ========================
    // Analytics
    // ========================
    '/api/analytics/summary': {
      get: {
        tags: ['Analytics'],
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
