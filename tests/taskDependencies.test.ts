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
      error: error.message,
      code: error.code || 'VALIDATION_ERROR'
    });
  }
  if (error.name === 'TaskNotFoundError') {
    return res.status(404).json({
      error: error.message
    });
  }
  res.status(500).json({ error: 'Internal server error' });
});

describe('Task Dependencies Integration Tests', () => {
  let taskService: TaskService;

  beforeEach(() => {
    taskService = TaskService.getInstance();
    taskService.resetStore();
  });

  describe('Setting Dependencies', () => {
    it('should set task dependencies successfully', async () => {
      // Create tasks
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

      // Set dependencies
      const response = await request(app)
        .put(`/api/tasks/${task1Id}/dependencies`)
        .send({
          dependencies: [task2Id]
        });

      expect(response.status).toBe(200);
      expect(response.body.dependencies).toEqual([task2Id]);
    });

    it('should reject self-dependency', async () => {
      const taskResponse = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Task 1',
          description: 'First task',
          dueDate: new Date(Date.now() + 86400000).toISOString(),
          tags: ['test']
        });

      const taskId = taskResponse.body.id;

      const response = await request(app)
        .put(`/api/tasks/${taskId}/dependencies`)
        .send({
          dependencies: [taskId]
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('SELF_DEPENDENCY');
    });

    it('should detect dependency cycles', async () => {
      // Create tasks
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

      // Try to set task2 depends on task1 (would create cycle)
      const response = await request(app)
        .put(`/api/tasks/${task2Id}/dependencies`)
        .send({
          dependencies: [task1Id]
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('DEPENDENCY_CYCLE');
    });
  });

  describe('Adding Dependencies', () => {
    it('should add dependencies to existing ones', async () => {
      // Create tasks
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

      const task3Response = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Task 3',
          description: 'Third task',
          dueDate: new Date(Date.now() + 86400000).toISOString(),
          tags: ['test']
        });

      const task1Id = task1Response.body.id;
      const task2Id = task2Response.body.id;
      const task3Id = task3Response.body.id;

      // Set initial dependency
      await request(app)
        .put(`/api/tasks/${task1Id}/dependencies`)
        .send({
          dependencies: [task2Id]
        });

      // Add another dependency
      const response = await request(app)
        .post(`/api/tasks/${task1Id}/dependencies`)
        .send({
          dependencies: [task3Id]
        });

      expect(response.status).toBe(200);
      expect(response.body.dependencies).toContain(task2Id);
      expect(response.body.dependencies).toContain(task3Id);
    });
  });

  describe('Removing Dependencies', () => {
    it('should remove specific dependency', async () => {
      // Create tasks
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

      const task3Response = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Task 3',
          description: 'Third task',
          dueDate: new Date(Date.now() + 86400000).toISOString(),
          tags: ['test']
        });

      const task1Id = task1Response.body.id;
      const task2Id = task2Response.body.id;
      const task3Id = task3Response.body.id;

      // Set dependencies
      await request(app)
        .put(`/api/tasks/${task1Id}/dependencies`)
        .send({
          dependencies: [task2Id, task3Id]
        });

      // Remove one dependency
      const response = await request(app)
        .delete(`/api/tasks/${task1Id}/dependencies/${task2Id}`);

      expect(response.status).toBe(200);
      expect(response.body.dependencies).toEqual([task3Id]);
      expect(response.body.dependencies).not.toContain(task2Id);
    });
  });

  describe('Completion Blocking', () => {
    it('should block completion when dependencies are incomplete', async () => {
      // Create tasks
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
      expect(response.body.code).toBe('BLOCKED_BY_DEPENDENCIES');
    });

    it('should allow completion when all dependencies are completed', async () => {
      // Create tasks
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

      // Complete task2 first
      await request(app)
        .patch(`/api/tasks/${task2Id}/status`)
        .send({
          status: TaskStatus.IN_PROGRESS
        });

      await request(app)
        .patch(`/api/tasks/${task2Id}/status`)
        .send({
          status: TaskStatus.COMPLETED
        });

      // Move task1 to in-progress
      await request(app)
        .patch(`/api/tasks/${task1Id}/status`)
        .send({
          status: TaskStatus.IN_PROGRESS
        });

      // Now complete task1 should work
      const response = await request(app)
        .patch(`/api/tasks/${task1Id}/status`)
        .send({
          status: TaskStatus.COMPLETED
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(TaskStatus.COMPLETED);
    });
  });

  describe('Delete with Dependencies', () => {
    it('should block deletion when task has dependents', async () => {
      // Create tasks
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
      expect(response.body.code).toBe('TASK_HAS_DEPENDENTS');
    });

    it('should allow force deletion and unlink dependents', async () => {
      // Create tasks
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
