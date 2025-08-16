import request from 'supertest';
import app from '../src/app';
import { TaskService } from '../src/services/taskService';
import { TaskStatus, TaskPriority } from '../src/types/task';

describe('Batch Operations', () => {
  let taskService: TaskService;

  beforeEach(() => {
    taskService = TaskService.getInstance();
    taskService.resetStore();
  });

  afterEach(() => {
    taskService.resetStore();
  });

  describe('POST /api/tasks/batch', () => {
    it('should execute successful batch operations and commit', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await request(app)
        .post('/api/tasks/batch')
        .send({
          operations: [
            {
              op: 'create',
              data: {
                title: 'Task 1',
                description: 'First task',
                dueDate: tomorrow.toISOString(),
                tags: ['test']
              }
            },
            {
              op: 'create',
              data: {
                title: 'Task 2',
                description: 'Second task',
                dueDate: tomorrow.toISOString(),
                tags: ['test'],
                priority: TaskPriority.HIGH
              }
            }
          ]
        })
        .expect(200);

      expect(response.body.committed).toBe(true);
      expect(response.body.results).toHaveLength(2);
      expect(response.body.results[0].success).toBe(true);
      expect(response.body.results[1].success).toBe(true);
      expect(response.body.results[0].data.title).toBe('Task 1');
      expect(response.body.results[1].data.title).toBe('Task 2');

      // Verify tasks were actually created
      const tasks = taskService.getAllTasks();
      expect(tasks).toHaveLength(2);
    });

    it('should rollback on validation failure in mid-batch', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await request(app)
        .post('/api/tasks/batch')
        .send({
          operations: [
            {
              op: 'create',
              data: {
                title: 'Valid Task',
                description: 'This should work',
                dueDate: tomorrow.toISOString(),
                tags: ['test']
              }
            },
            {
              op: 'create',
              data: {
                title: 'Invalid Task',
                description: 'Missing tags',
                dueDate: tomorrow.toISOString()
                // Missing required tags field
              }
            }
          ]
        })
        .expect(400);

      expect(response.body.committed).toBe(false);
      expect(response.body.error.code).toBe('BATCH_ROLLBACK');
      expect(response.body.error.message).toBe('Batch operation failed and was rolled back');

      // Verify no tasks were created
      const tasks = taskService.getAllTasks();
      expect(tasks).toHaveLength(0);
    });

    it('should rollback on dependency validation failure', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      // First create a task to update
      const createResponse = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Existing Task',
          description: 'Task to update',
          dueDate: tomorrow.toISOString(),
          tags: ['existing']
        });

      const taskId = createResponse.body.id;

      const response = await request(app)
        .post('/api/tasks/batch')
        .send({
          operations: [
            {
              op: 'update',
              id: taskId,
              data: {
                status: TaskStatus.IN_PROGRESS
              }
            },
            {
              op: 'update',
              id: taskId,
              data: {
                status: TaskStatus.COMPLETED,
                dependencies: [taskId] // Self-dependency should fail
              }
            }
          ]
        })
        .expect(400);

      expect(response.body.committed).toBe(false);
      expect(response.body.error.code).toBe('BATCH_ROLLBACK');

      // Verify original task is unchanged
      const task = taskService.getTask(taskId);
      expect(task.status).toBe(TaskStatus.PENDING);
    });

    it('should rollback when trying to delete referenced task without force', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Create two tasks with dependency
      const task1Response = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Dependency Task',
          description: 'Will be depended on',
          dueDate: tomorrow.toISOString(),
          tags: ['dependency']
        });

      const task2Response = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Dependent Task',
          description: 'Depends on first task',
          dueDate: tomorrow.toISOString(),
          tags: ['dependent'],
          dependencies: [task1Response.body.id]
        });

      const response = await request(app)
        .post('/api/tasks/batch')
        .send({
          operations: [
            {
              op: 'update',
              id: task2Response.body.id,
              data: {
                title: 'Updated Dependent Task'
              }
            },
            {
              op: 'delete',
              id: task1Response.body.id
              // No force flag - should fail because task2 depends on task1
            }
          ]
        })
        .expect(400);

      expect(response.body.committed).toBe(false);
      expect(response.body.error.code).toBe('BATCH_ROLLBACK');

      // Verify both tasks still exist and task2 is unchanged
      const task1 = taskService.getTask(task1Response.body.id);
      const task2 = taskService.getTask(task2Response.body.id);
      expect(task1.title).toBe('Dependency Task');
      expect(task2.title).toBe('Dependent Task'); // Should not be updated
    });

    it('should succeed with forced delete that unlinks dependencies', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Create two tasks with dependency
      const task1Response = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Dependency Task',
          description: 'Will be deleted with force',
          dueDate: tomorrow.toISOString(),
          tags: ['dependency']
        });

      const task2Response = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Dependent Task',
          description: 'Depends on first task',
          dueDate: tomorrow.toISOString(),
          tags: ['dependent'],
          dependencies: [task1Response.body.id]
        });

      const response = await request(app)
        .post('/api/tasks/batch')
        .send({
          operations: [
            {
              op: 'update',
              id: task2Response.body.id,
              data: {
                title: 'Updated Dependent Task'
              }
            },
            {
              op: 'delete',
              id: task1Response.body.id,
              force: true // Force delete should unlink dependencies
            }
          ]
        })
        .expect(200);

      expect(response.body.committed).toBe(true);
      expect(response.body.results).toHaveLength(2);
      expect(response.body.results[0].success).toBe(true);
      expect(response.body.results[1].success).toBe(true);

      // Verify task1 is deleted and task2 is updated with dependencies removed
      expect(() => taskService.getTask(task1Response.body.id)).toThrow();
      const task2 = taskService.getTask(task2Response.body.id);
      expect(task2.title).toBe('Updated Dependent Task');
      expect(task2.dependencies).toHaveLength(0);
    });

    it('should serialize parallel batch requests', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Create multiple batch requests in parallel
      const batch1Promise = request(app)
        .post('/api/tasks/batch')
        .send({
          operations: [
            {
              op: 'create',
              data: {
                title: 'Batch 1 Task 1',
                description: 'From first batch',
                dueDate: tomorrow.toISOString(),
                tags: ['batch1']
              }
            },
            {
              op: 'create',
              data: {
                title: 'Batch 1 Task 2',
                description: 'From first batch',
                dueDate: tomorrow.toISOString(),
                tags: ['batch1']
              }
            }
          ]
        });

      const batch2Promise = request(app)
        .post('/api/tasks/batch')
        .send({
          operations: [
            {
              op: 'create',
              data: {
                title: 'Batch 2 Task 1',
                description: 'From second batch',
                dueDate: tomorrow.toISOString(),
                tags: ['batch2']
              }
            },
            {
              op: 'create',
              data: {
                title: 'Batch 2 Task 2',
                description: 'From second batch',
                dueDate: tomorrow.toISOString(),
                tags: ['batch2']
              }
            }
          ]
        });

      const [response1, response2] = await Promise.all([batch1Promise, batch2Promise]);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response1.body.committed).toBe(true);
      expect(response2.body.committed).toBe(true);

      // Verify all tasks were created
      const tasks = taskService.getAllTasks();
      expect(tasks).toHaveLength(4);

      const batch1Tasks = tasks.filter(t => t.tags.includes('batch1'));
      const batch2Tasks = tasks.filter(t => t.tags.includes('batch2'));
      expect(batch1Tasks).toHaveLength(2);
      expect(batch2Tasks).toHaveLength(2);
    });

    it('should validate batch request structure', async () => {
      const response1 = await request(app)
        .post('/api/tasks/batch')
        .send({})
        .expect(400);

      expect(response1.body.error.code).toBe('VALIDATION_ERROR');
      expect(response1.body.error.message).toBe('Operations array is required');

      const response2 = await request(app)
        .post('/api/tasks/batch')
        .send({
          operations: []
        })
        .expect(400);

      expect(response2.body.error.code).toBe('VALIDATION_ERROR');
      expect(response2.body.error.message).toBe('At least one operation is required');
    });

    it('should handle mixed operation types in single batch', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      // First create a task to update and delete
      const createResponse = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Existing Task',
          description: 'Will be updated then deleted',
          dueDate: tomorrow.toISOString(),
          tags: ['existing']
        });

      const existingTaskId = createResponse.body.id;

      const response = await request(app)
        .post('/api/tasks/batch')
        .send({
          operations: [
            {
              op: 'create',
              data: {
                title: 'New Task',
                description: 'Created in batch',
                dueDate: tomorrow.toISOString(),
                tags: ['new']
              }
            },
            {
              op: 'update',
              id: existingTaskId,
              data: {
                title: 'Updated Existing Task',
                status: TaskStatus.IN_PROGRESS
              }
            },
            {
              op: 'delete',
              id: existingTaskId
            }
          ]
        })
        .expect(200);

      expect(response.body.committed).toBe(true);
      expect(response.body.results).toHaveLength(3);
      expect(response.body.results[0].op).toBe('create');
      expect(response.body.results[1].op).toBe('update');
      expect(response.body.results[2].op).toBe('delete');

      // Verify final state
      const tasks = taskService.getAllTasks();
      expect(tasks).toHaveLength(1); // Only the new task should remain
      expect(tasks[0].title).toBe('New Task');
      
      // Verify the existing task was deleted
      expect(() => taskService.getTask(existingTaskId)).toThrow();
    });
  });
});
