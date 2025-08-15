import swaggerJsdoc from 'swagger-jsdoc';
import { TaskStatus, TaskPriority } from '../types/task';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Summit Tasks API',
      version: '1.0.0',
      description: 'A task management API with state machine workflow',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      schemas: {
        Task: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique task identifier',
            },
            title: {
              type: 'string',
              description: 'Task title',
            },
            description: {
              type: 'string',
              description: 'Task description',
            },
            dueDate: {
              type: 'string',
              format: 'date-time',
              description: 'Task due date',
            },
            status: {
              type: 'string',
              enum: Object.values(TaskStatus),
              description: 'Task status',
            },
            priority: {
              type: 'string',
              enum: Object.values(TaskPriority),
              description: 'Task priority',
            },
            tags: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Task tags',
            },
            dependencies: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Task dependencies (IDs of other tasks)',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Task creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Task last update timestamp',
            },
            completedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Task completion timestamp',
              nullable: true,
            },
          },
          required: [
            'id',
            'title',
            'description',
            'dueDate',
            'status',
            'priority',
            'tags',
            'dependencies',
            'createdAt',
            'updatedAt',
          ],
        },
        CreateTaskRequest: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Task title',
            },
            description: {
              type: 'string',
              description: 'Task description',
            },
            dueDate: {
              type: 'string',
              format: 'date-time',
              description: 'Task due date',
            },
            priority: {
              type: 'string',
              enum: Object.values(TaskPriority),
              description: 'Task priority',
            },
            tags: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Task tags',
            },
            dependencies: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Task dependencies (IDs of other tasks)',
            },
          },
          required: ['title', 'description', 'dueDate', 'priority'],
        },
        UpdateTaskRequest: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Task title',
            },
            description: {
              type: 'string',
              description: 'Task description',
            },
            dueDate: {
              type: 'string',
              format: 'date-time',
              description: 'Task due date',
            },
            priority: {
              type: 'string',
              enum: Object.values(TaskPriority),
              description: 'Task priority',
            },
            tags: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Task tags',
            },
            dependencies: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Task dependencies (IDs of other tasks)',
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  description: 'Error code',
                },
                message: {
                  type: 'string',
                  description: 'Error message',
                },
                details: {
                  description: 'Additional error details',
                },
              },
              required: ['code', 'message'],
            },
          },
          required: ['error'],
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
};

export const specs = swaggerJsdoc(options);
