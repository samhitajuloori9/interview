import swaggerJsdoc from 'swagger-jsdoc';
import { TaskStatus, TaskPriority } from '../types/task';
import { TimeInterval } from '../utils/analytics';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Summit Tasks API',
      version: '1.0.0',
      description: 'A task management API with state machine workflow and analytics',
    },
    tags: [
      {
        name: 'Tasks',
        description: 'Task management endpoints'
      },
      {
        name: 'Analytics',
        description: 'Task analytics and reporting endpoints'
      }
    ],
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
        CompletionRateData: {
          type: 'object',
          properties: {
            date: {
              type: 'string',
              format: 'date',
              description: 'The date or period this data point represents'
            },
            completed: {
              type: 'integer',
              description: 'Number of tasks completed in this period'
            },
            total: {
              type: 'integer',
              description: 'Total number of tasks in this period'
            },
            completionRate: {
              type: 'number',
              format: 'float',
              description: 'Completion rate as a percentage (0-100)'
            }
          }
        },
        AvgCompletionTimeData: {
          type: 'object',
          properties: {
            group: {
              type: 'string',
              description: 'The group this average represents (priority or overall)'
            },
            avgCompletionTimeHours: {
              type: 'number',
              format: 'float',
              description: 'Average completion time in hours'
            },
            count: {
              type: 'integer',
              description: 'Number of tasks in this group'
            }
          }
        },
        TopTag: {
          type: 'object',
          properties: {
            tag: {
              type: 'string',
              description: 'The tag name'
            },
            count: {
              type: 'integer',
              description: 'Number of tasks with this tag'
            },
            completionRate: {
              type: 'number',
              format: 'float',
              description: 'Completion rate for tasks with this tag (0-100)'
            }
          }
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
};

export const specs = swaggerJsdoc(options);
