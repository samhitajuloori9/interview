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
              example: 'Complete project documentation',
            },
            description: {
              type: 'string',
              description: 'Task description',
              example: 'Write comprehensive documentation for the project including API docs and user guide',
            },
            dueDate: {
              type: 'string',
              format: 'date-time',
              description: 'Task due date (must be in the future)',
              example: '2024-12-31T23:59:59.000Z',
            },
            priority: {
              type: 'string',
              enum: Object.values(TaskPriority),
              description: 'Task priority',
              example: 'high',
              default: 'medium',
            },
            tags: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Task tags (at least one required)',
              example: ['documentation', 'high-priority'],
              minItems: 1,
            },
            dependencies: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Task dependencies (IDs of other tasks)',
              example: ['task-id-1', 'task-id-2'],
              default: [],
            },
          },
          required: ['title', 'description', 'dueDate', 'tags'],
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
                  enum: [
                    'VALIDATION_ERROR',
                    'INVALID_STATE_TRANSITION',
                    'DEPENDENCY_CYCLE',
                    'BLOCKED_BY_DEPENDENCIES',
                    'SELF_DEPENDENCY',
                    'TASK_HAS_DEPENDENTS'
                  ],
                },
                message: {
                  type: 'string',
                  description: 'Error message',
                },
                details: {
                  type: 'array',
                  items: {
                    type: 'string'
                  },
                  description: 'Additional error details',
                },
              },
            },
            statusTransition: {
              summary: 'Invalid Status Transition',
              value: {
                error: {
                  code: 'INVALID_STATE_TRANSITION',
                  message: 'Cannot transition from pending to completed'
                }
              }
            },
            dependencyCycle: {
              summary: 'Dependency Cycle',
              value: {
                error: {
                  code: 'DEPENDENCY_CYCLE',
                  message: 'Adding dependency would create a cycle'
                }
              }
            },
            blockedByDependencies: {
              summary: 'Blocked by Dependencies',
              value: {
                error: {
                  code: 'BLOCKED_BY_DEPENDENCIES',
                  message: 'Cannot complete task while dependencies are incomplete'
                }
              }
            }
          }
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Task'
              }
            },
            pagination: {
              type: 'object',
              properties: {
                page: {
                  type: 'integer',
                  example: 1
                },
                pageSize: {
                  type: 'integer',
                  example: 10
                },
                total: {
                  type: 'integer',
                  example: 25
                },
                totalPages: {
                  type: 'integer',
                  example: 3
                }
              }
            }
          }
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
};

export const specs = swaggerJsdoc(options);
