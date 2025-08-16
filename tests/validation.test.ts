import request from 'supertest';
import express from 'express';
import taskRoutes from '../src/routes/taskRoutes';
import { TaskService } from '../src/services/taskService';
import { TaskStatus, TaskPriority } from '../src/types/task';

const app = express();
app.use(express.json());
app.use('/api/tasks', taskRoutes);

// Error handler middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (error.name === 'TaskValidationError') {
    return res.status(400).json({
      error: {
        code: error.code || 'VALIDATION_ERROR',
        message: error.message,
        details: error.details
      }
    });
  }
  if (error.name === 'TaskNotFoundError') {
    return res.status(404).json({
      error: {
        code: 'TASK_NOT_FOUND',
        message: error.message
      }
    });
  }
  if (error.name === 'TaskStateError') {
    return res.status(400).json({
      error: {
        code: 'INVALID_STATUS_TRANSITION',
        message: error.message
      }
    });
  }
  res.status(500).json({ 
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error'
    }
  });
});

describe('Validation Tests', () => {
  let taskService: TaskService;

  beforeEach(() => {
    taskService = TaskService.getInstance();
    taskService.resetStore();
  });

  describe('Required Fields Validation', () => {
    it('should reject task creation without title', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({
          description: 'Test description',
          dueDate: new Date(Date.now() + 86400000).toISOString(),
          tags: ['test']
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toContain('"title" is required');
    });

    it('should reject task creation without description', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Test task',
          dueDate: new Date(Date.now() + 86400000).toISOString(),
          tags: ['test']
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toContain('"description" is required');
    });

    it('should reject task creation without dueDate', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Test task',
          description: 'Test description',
          tags: ['test']
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toContain('"dueDate" is required');
    });

    it('should reject task creation without tags', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Test task',
          description: 'Test description',
          dueDate: new Date(Date.now() + 86400000).toISOString()
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toContain('"tags" is required');
    });

    it('should reject task creation with empty tags array', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Test task',
          description: 'Test description',
          dueDate: new Date(Date.now() + 86400000).toISOString(),
          tags: []
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toContain('"tags" must contain at least 1 items');
    });
  });

  describe('Due Date Validation', () => {
    it('should reject task creation with past due date', async () => {
      const pastDate = new Date(Date.now() - 86400000); // Yesterday

      const response = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Test task',
          description: 'Test description',
          dueDate: pastDate.toISOString(),
          tags: ['test']
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toContain('"dueDate" must be greater than "now"');
    });

    it('should accept task creation with future due date', async () => {
      const futureDate = new Date(Date.now() + 86400000); // Tomorrow

      const response = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Test task',
          description: 'Test description',
          dueDate: futureDate.toISOString(),
          tags: ['test']
        });

      expect(response.status).toBe(201);
      expect(response.body.title).toBe('Test task');
    });
  });

  describe('Status Transition Validation', () => {
    it('should reject invalid status transitions', async () => {
      // Create a task
      const createResponse = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Test task',
          description: 'Test description',
          dueDate: new Date(Date.now() + 86400000).toISOString(),
          tags: ['test']
        });

      const taskId = createResponse.body.id;

      // Try to transition directly from pending to completed (invalid)
      const response = await request(app)
        .patch(`/api/tasks/${taskId}/status`)
        .send({
          status: TaskStatus.COMPLETED
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_STATE_TRANSITION');
    });

    it('should allow valid status transitions', async () => {
      // Create a task
      const createResponse = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Test task',
          description: 'Test description',
          dueDate: new Date(Date.now() + 86400000).toISOString(),
          tags: ['test']
        });

      const taskId = createResponse.body.id;

      // Valid transition: pending -> in-progress
      const response1 = await request(app)
        .patch(`/api/tasks/${taskId}/status`)
        .send({
          status: TaskStatus.IN_PROGRESS
        });

      expect(response1.status).toBe(200);
      expect(response1.body.status).toBe(TaskStatus.IN_PROGRESS);

      // Valid transition: in-progress -> completed
      const response2 = await request(app)
        .patch(`/api/tasks/${taskId}/status`)
        .send({
          status: TaskStatus.COMPLETED
        });

      expect(response2.status).toBe(200);
      expect(response2.body.status).toBe(TaskStatus.COMPLETED);
      expect(response2.body.completedAt).toBeDefined();
    });
  });

  describe('High Priority Archive Validation', () => {
    it('should reject archiving high priority task that is not completed', async () => {
      // Create a high priority task
      const createResponse = await request(app)
        .post('/api/tasks')
        .send({
          title: 'High priority task',
          description: 'Important task',
          dueDate: new Date(Date.now() + 86400000).toISOString(),
          priority: TaskPriority.HIGH,
          tags: ['urgent']
        });

      const taskId = createResponse.body.id;

      // Move to in-progress
      await request(app)
        .patch(`/api/tasks/${taskId}/status`)
        .send({
          status: TaskStatus.IN_PROGRESS
        });

      // Try to archive without completing (should fail)
      const response = await request(app)
        .patch(`/api/tasks/${taskId}/status`)
        .send({
          status: TaskStatus.ARCHIVED
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_STATE_TRANSITION');
    });

    it('should allow archiving high priority task after completion', async () => {
      // Create a high priority task
      const createResponse = await request(app)
        .post('/api/tasks')
        .send({
          title: 'High priority task',
          description: 'Important task',
          dueDate: new Date(Date.now() + 86400000).toISOString(),
          priority: TaskPriority.HIGH,
          tags: ['urgent']
        });

      const taskId = createResponse.body.id;

      // Complete the task first
      await request(app)
        .patch(`/api/tasks/${taskId}/status`)
        .send({
          status: TaskStatus.IN_PROGRESS
        });

      await request(app)
        .patch(`/api/tasks/${taskId}/status`)
        .send({
          status: TaskStatus.COMPLETED
        });

      // Now archive should work
      const response = await request(app)
        .patch(`/api/tasks/${taskId}/status`)
        .send({
          status: TaskStatus.ARCHIVED
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(TaskStatus.ARCHIVED);
    });
  });

  describe('Dependency Validation', () => {
    it('should reject self-dependency', async () => {
      const createResponse = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Test task',
          description: 'Test description',
          dueDate: new Date(Date.now() + 86400000).toISOString(),
          tags: ['test']
        });

      const taskId = createResponse.body.id;

      const response = await request(app)
        .put(`/api/tasks/${taskId}/dependencies`)
        .send({
          dependencies: [taskId]
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('SELF_DEPENDENCY');
    });

    it('should detect dependency cycles', async () => {
      // Create two tasks
      const task1Response = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Task 1',
          description: 'First task',
          dueDate: new Date(Date.now() + 86400000).toISOString(),
          tags: ['test']
        });

      const task2Response = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Task 2',
          description: 'Second task',
          dueDate: new Date(Date.now() + 86400000).toISOString(),
          tags: ['test']
        });

      const task1Id = task1Response.body.id;
      const task2Id = task2Response.body.id;

      // Set task1 depends on task2
      await request(app)
        .put(`/api/tasks/${task1Id}/dependencies`)
        .send({
          dependencies: [task2Id]
        });

      // Try to set task2 depends on task1 (creates cycle)
      const response = await request(app)
        .put(`/api/tasks/${task2Id}/dependencies`)
        .send({
          dependencies: [task1Id]
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('DEPENDENCY_CYCLE');
    });

    it('should block completion when dependencies are incomplete', async () => {
      // Create two tasks
      const task1Response = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Task 1',
          description: 'First task',
          dueDate: new Date(Date.now() + 86400000).toISOString(),
          tags: ['test']
        });

      const task2Response = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Task 2',
          description: 'Second task',
          dueDate: new Date(Date.now() + 86400000).toISOString(),
          tags: ['test']
        });

      const task1Id = task1Response.body.id;
      const task2Id = task2Response.body.id;

      // Set task1 depends on task2
      await request(app)
        .put(`/api/tasks/${task1Id}/dependencies`)
        .send({
          dependencies: [task2Id]
        });

      // Move task1 to in-progress
      await request(app)
        .patch(`/api/tasks/${task1Id}/status`)
        .send({
          status: TaskStatus.IN_PROGRESS
        });

      // Try to complete task1 while task2 is still pending
      const response = await request(app)
        .patch(`/api/tasks/${task1Id}/status`)
        .send({
          status: TaskStatus.COMPLETED
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('BLOCKED_BY_DEPENDENCIES');
    });
  });

  describe('Delete with Dependencies', () => {
    it('should block deletion when task has dependents', async () => {
      // Create two tasks
      const task1Response = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Task 1',
          description: 'First task',
          dueDate: new Date(Date.now() + 86400000).toISOString(),
          tags: ['test']
        });

      const task2Response = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Task 2',
          description: 'Second task',
          dueDate: new Date(Date.now() + 86400000).toISOString(),
          tags: ['test']
        });

      const task1Id = task1Response.body.id;
      const task2Id = task2Response.body.id;

      // Set task1 depends on task2
      await request(app)
        .put(`/api/tasks/${task1Id}/dependencies`)
        .send({
          dependencies: [task2Id]
        });

      // Try to delete task2 (has dependents)
      const response = await request(app)
        .delete(`/api/tasks/${task2Id}`);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('TASK_HAS_DEPENDENTS');
    });

    it('should allow force deletion and unlink dependents', async () => {
      // Create two tasks
      const task1Response = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Task 1',
          description: 'First task',
          dueDate: new Date(Date.now() + 86400000).toISOString(),
          tags: ['test']
        });

      const task2Response = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Task 2',
          description: 'Second task',
          dueDate: new Date(Date.now() + 86400000).toISOString(),
          tags: ['test']
        });

      const task1Id = task1Response.body.id;
      const task2Id = task2Response.body.id;

      // Set task1 depends on task2
      await request(app)
        .put(`/api/tasks/${task1Id}/dependencies`)
        .send({
          dependencies: [task2Id]
        });

      // Force delete task2
      const deleteResponse = await request(app)
        .delete(`/api/tasks/${task2Id}?force=true`);

      expect(deleteResponse.status).toBe(204);

      // Verify task1 no longer has task2 as dependency
      const task1Response2 = await request(app)
        .get(`/api/tasks/${task1Id}`);

      expect(task1Response2.body.dependencies).toEqual([]);
    });
  });
});
