import swaggerUi from 'swagger-ui-express';

const errorResponse = {
  type: 'object',
  properties: {
    error: { type: 'string' },
    message: { type: 'string' },
    status: { type: 'string' },
    statusCode: { type: 'integer' },
  },
};

const authRequired = {
  401: {
    description: 'Missing, invalid, or expired JWT token',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ErrorResponse' },
      },
    },
  },
};

const adminRequired = {
  403: {
    description: 'Access denied. Admins only.',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ErrorResponse' },
      },
    },
  },
};

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Nirikshan-AI API Documentation',
    version: '1.0.0',
    description:
      'API for Nirikshan-AI video surveillance, camera management, incident tracking, analytics, and mobile notifications.',
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Local development server',
    },
    {
      url: 'http://192.168.1.81:5000',
      description: 'Physical device LAN development server',
    },
  ],
  tags: [
    { name: 'Auth', description: 'Authentication and password reset' },
    { name: 'Operators', description: 'Admin-only operator management' },
    { name: 'Cameras', description: 'Camera registry and AI settings' },
    { name: 'Incidents', description: 'Incident logging and retrieval' },
    { name: 'Analytics', description: 'Dashboard summary metrics' },
    { name: 'Notifications', description: 'Mobile FCM token registration' },
    { name: 'Debug', description: 'Development and diagnostics endpoints' },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter only the JWT token value.',
      },
    },
    schemas: {
      ErrorResponse: errorResponse,
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['ADMIN', 'OPERATOR'] },
          resetToken: { type: 'string', nullable: true },
          resetTokenExpiry: { type: 'string', format: 'date-time', nullable: true },
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
          rtspUrl: { type: 'string', description: 'RTSP URL or local webcam index such as 0' },
          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'MAINTENANCE'] },
          crowdThreshold: { type: 'integer', default: 3 },
          restrictedPolygon: {
            type: 'array',
            nullable: true,
            items: {
              type: 'object',
              properties: {
                x: { type: 'number' },
                y: { type: 'number' },
              },
            },
          },
          restrictedStartTime: { type: 'string', nullable: true, example: '17:00:00' },
          restrictedEndTime: { type: 'string', nullable: true, example: '20:00:00' },
          confidenceThreshold: { type: 'number', format: 'float', default: 0.5 },
          cooldownSeconds: { type: 'integer', default: 10 },
          alertsEnabled: { type: 'boolean', default: true },
          intrusionEnabled: { type: 'boolean', default: true },
          crowdEnabled: { type: 'boolean', default: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CameraConfigEntry: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          label: { type: 'string' },
          description: { type: 'string' },
          type: { type: 'string', enum: ['integer', 'float', 'boolean', 'time', 'json'] },
          category: { type: 'string' },
          default: { nullable: true },
          value: { nullable: true },
          min: { type: 'number' },
          max: { type: 'number' },
          step: { type: 'number' },
          readOnly: { type: 'boolean' },
        },
      },
      Incident: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          type: {
            type: 'string',
            enum: ['PERSON_DETECTED', 'INTRUSION', 'CROWD', 'RESTRICTED_AREA'],
          },
          description: { type: 'string', nullable: true },
          severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
          imageUrl: {
            type: 'string',
            nullable: true,
            description: 'Snapshot URL or data:image/jpeg;base64 payload.',
          },
          timestamp: { type: 'string', format: 'date-time' },
          camera: { $ref: '#/components/schemas/Camera' },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          totalRecords: { type: 'integer' },
          totalPages: { type: 'integer' },
          currentPage: { type: 'integer' },
          limit: { type: 'integer' },
        },
      },
      IncidentListResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/Incident' },
          },
          pagination: { $ref: '#/components/schemas/Pagination' },
        },
      },
      AnalyticsSummary: {
        type: 'object',
        properties: {
          cameras: {
            type: 'object',
            properties: {
              total: { type: 'integer' },
              active: { type: 'integer' },
            },
          },
          incidents: {
            type: 'object',
            properties: {
              total: { type: 'integer' },
              bySeverity: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    severity: { type: 'string' },
                    count: { type: 'string' },
                  },
                },
              },
              byType: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    type: { type: 'string' },
                    count: { type: 'string' },
                  },
                },
              },
            },
          },
          recentIncidents: {
            type: 'array',
            items: { $ref: '#/components/schemas/Incident' },
          },
        },
      },
      FcmTokenRequest: {
        type: 'object',
        required: ['token'],
        properties: {
          token: { type: 'string', description: 'Firebase Cloud Messaging device token' },
        },
      },
    },
  },
  security: [{ BearerAuth: [] }],
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
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 6 },
                  role: { type: 'string', enum: ['ADMIN', 'OPERATOR'], default: 'OPERATOR' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'User registered successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    user: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          400: { description: 'Invalid input or email already exists' },
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
                  email: { type: 'string', format: 'email' },
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
          401: { description: 'Invalid credentials' },
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
                properties: { email: { type: 'string', format: 'email' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'If the email exists, a reset link has been sent.' },
          400: { description: 'Email is required' },
          500: { description: 'Password reset email failed' },
        },
      },
    },
    '/api/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Reset password using a reset token',
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
          200: { description: 'Password reset successful' },
          400: { description: 'Invalid input, invalid token, or expired token' },
        },
      },
    },
    '/api/operators': {
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
          ...authRequired,
          ...adminRequired,
        },
      },
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
                  name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
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
          400: { description: 'Invalid input or email already exists' },
          ...authRequired,
          ...adminRequired,
        },
      },
    },
    '/api/operators/{id}': {
      get: {
        tags: ['Operators'],
        summary: 'Get a single operator by ID (Admin only)',
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        responses: {
          200: {
            description: 'Operator details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { data: { $ref: '#/components/schemas/User' } },
                },
              },
            },
          },
          404: { description: 'Operator not found' },
          ...authRequired,
          ...adminRequired,
        },
      },
      put: {
        tags: ['Operators'],
        summary: 'Update operator profile (Admin only)',
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Operator updated successfully' },
          400: { description: 'Invalid input, email already exists, or operator not found' },
          ...authRequired,
          ...adminRequired,
        },
      },
      delete: {
        tags: ['Operators'],
        summary: 'Delete an operator account (Admin only)',
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        responses: {
          200: { description: 'Operator deleted successfully' },
          400: { description: 'Operator not found or invalid role' },
          ...authRequired,
          ...adminRequired,
        },
      },
    },
    '/api/operators/{id}/password': {
      patch: {
        tags: ['Operators'],
        summary: 'Change an operator password (Admin only)',
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['newPassword'],
                properties: {
                  newPassword: { type: 'string', minLength: 6 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Operator password changed successfully' },
          400: { description: 'Invalid input or operator not found' },
          ...authRequired,
          ...adminRequired,
        },
      },
    },
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
          ...authRequired,
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
                  rtspUrl: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Camera added successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    camera: { $ref: '#/components/schemas/Camera' },
                  },
                },
              },
            },
          },
          400: { description: 'Missing required fields' },
          ...authRequired,
          ...adminRequired,
        },
      },
    },
    '/api/cameras/{id}': {
      get: {
        tags: ['Cameras'],
        summary: 'Get a camera by ID',
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        responses: {
          200: {
            description: 'Camera details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Camera' },
              },
            },
          },
          404: { description: 'Camera not found' },
          ...authRequired,
        },
      },
      delete: {
        tags: ['Cameras'],
        summary: 'Delete a camera (Admin only)',
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        responses: {
          200: { description: 'Camera deleted successfully' },
          400: { description: 'Camera not found' },
          ...authRequired,
          ...adminRequired,
        },
      },
    },
    '/api/cameras/{id}/config-schema': {
      get: {
        tags: ['Cameras'],
        summary: 'Get dynamic AI settings schema for a camera',
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        responses: {
          200: {
            description: 'Camera settings schema with current values',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/CameraConfigEntry' },
                },
              },
            },
          },
          404: { description: 'Camera not found' },
          ...authRequired,
        },
      },
    },
    '/api/cameras/{id}/settings': {
      put: {
        tags: ['Cameras'],
        summary: 'Update camera AI settings (Admin only)',
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  confidenceThreshold: { type: 'number', minimum: 0.1, maximum: 1 },
                  crowdThreshold: { type: 'integer', minimum: 1, maximum: 100 },
                  alertsEnabled: { type: 'boolean' },
                  intrusionEnabled: { type: 'boolean' },
                  crowdEnabled: { type: 'boolean' },
                  cooldownSeconds: { type: 'integer', minimum: 1, maximum: 300 },
                  restrictedStartTime: { type: 'string', nullable: true, example: '17:00:00' },
                  restrictedEndTime: { type: 'string', nullable: true, example: '20:00:00' },
                  restrictedPolygon: {
                    type: 'array',
                    nullable: true,
                    items: {
                      type: 'object',
                      properties: {
                        x: { type: 'number' },
                        y: { type: 'number' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Settings updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    camera: { $ref: '#/components/schemas/Camera' },
                  },
                },
              },
            },
          },
          400: { description: 'Invalid settings or camera not found' },
          ...authRequired,
          ...adminRequired,
        },
      },
    },
    '/api/incidents': {
      get: {
        tags: ['Incidents'],
        summary: 'Get all incidents with pagination',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1, minimum: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10, minimum: 1 } },
        ],
        responses: {
          200: {
            description: 'Paginated list of incidents',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/IncidentListResponse' },
              },
            },
          },
          400: { description: 'Page and limit must be positive integers' },
          ...authRequired,
        },
      },
      post: {
        tags: ['Incidents'],
        summary: 'Log a new incident',
        description:
          'Used by the AI service; also broadcasts Socket.IO and sends FCM notifications.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['type', 'cameraId'],
                properties: {
                  type: {
                    type: 'string',
                    enum: ['PERSON_DETECTED', 'INTRUSION', 'CROWD', 'RESTRICTED_AREA'],
                  },
                  description: { type: 'string' },
                  severity: {
                    type: 'string',
                    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
                    default: 'MEDIUM',
                  },
                  imageUrl: {
                    type: 'string',
                    description: 'Snapshot URL or data:image/jpeg;base64 payload',
                  },
                  cameraId: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Incident logged successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    incident: { $ref: '#/components/schemas/Incident' },
                  },
                },
              },
            },
          },
          400: { description: 'Invalid type, invalid severity, or camera not found' },
          ...authRequired,
        },
      },
    },
    '/api/analytics/summary': {
      get: {
        tags: ['Analytics'],
        summary: 'Get dashboard summary metrics',
        responses: {
          200: {
            description: 'Summary dashboard metrics and recent incidents',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AnalyticsSummary' },
              },
            },
          },
          ...authRequired,
        },
      },
    },
    '/api/notifications/register': {
      post: {
        tags: ['Notifications'],
        summary: 'Register a mobile device FCM token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/FcmTokenRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Device registered for push notifications',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    totalDevices: { type: 'integer' },
                  },
                },
              },
            },
          },
          400: { description: 'FCM token is required' },
          ...authRequired,
        },
      },
    },
    '/api/notifications/unregister': {
      post: {
        tags: ['Notifications'],
        summary: 'Unregister a mobile device FCM token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/FcmTokenRequest' },
            },
          },
        },
        responses: {
          200: { description: 'Device unregistered from push notifications' },
          400: { description: 'FCM token is required' },
          ...authRequired,
        },
      },
    },
    '/api/debug/socket-status': {
      get: {
        tags: ['Debug'],
        summary: 'Get Socket.IO client connection status',
        responses: {
          200: {
            description: 'Connected Socket.IO clients',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    connectedClients: { type: 'integer' },
                    clients: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          origin: { type: 'string', nullable: true },
                          transport: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          ...authRequired,
        },
      },
    },
    '/api/debug/test-incident': {
      post: {
        tags: ['Debug'],
        summary: 'Create a test incident on the first camera',
        responses: {
          201: {
            description: 'Test incident created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    incident: { $ref: '#/components/schemas/Incident' },
                  },
                },
              },
            },
          },
          400: { description: 'No camera exists to attach a test incident' },
          ...authRequired,
        },
      },
    },
  },
};

swaggerDocument.components.parameters = {
  IdPath: {
    name: 'id',
    in: 'path',
    required: true,
    schema: { type: 'string', format: 'uuid' },
  },
};

export const serveSwagger = swaggerUi.serve;
export const setupSwagger = swaggerUi.setup(swaggerDocument);
