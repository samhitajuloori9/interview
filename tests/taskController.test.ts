import request from 'supertest';
import app from '../src/app';
import { TaskStatus, TaskPriority } from '../src/types/task';

describe('Task Controller', () => {
  let taskId: string;

  describe('POST /api/tasks', () => {
    it('should create a new task', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const taskData = {
        title: 'Test Task',
        description: 'This is a test task',
        dueDate: tomorrow.toISOString(),
        priority: TaskPriority.HIGH,
        tags: ['test', 'api'],
        dependencies: [],
      };

      const response = await request(app).post('/api/tasks').send(taskData).expect(201);

      expect(response.body).toMatchObject({
        title: taskData.title,
        description: taskData.description,
        priority: taskData.priority,
        status: TaskStatus.PENDING,
        tags: taskData.tags,
        dependencies: taskData.dependencies,
      });
      expect(response.body.id).toBeDefined();
      expect(response.body.createdAt).toBeDefined();
      expect(response.body.updatedAt).toBeDefined();

      taskId = response.body.id;
    });

    it('should return validation error for missing tags', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Incomplete Task',
          description: 'Missing tags',
          dueDate: tomorrow.toISOString(),
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('At least one tag is required');
    });
  });

  describe('GET /api/tasks', () => {
    it('should get all tasks with pagination', async () => {
      const response = await request(app).get('/api/tasks').expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should filter tasks by status', async () => {
      const response = await request(app).get('/api/tasks?status=pending').expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      response.body.data.forEach((task: any) => {
        expect(task.status).toBe(TaskStatus.PENDING);
      });
    });
  });

  describe('GET /api/tasks/:id', () => {
    it('should get a specific task', async () => {
      const response = await request(app).get(`/api/tasks/${taskId}`).expect(200);

      expect(response.body.id).toBe(taskId);
      expect(response.body.title).toBe('Test Task');
    });

    it('should return 404 for non-existent task', async () => {
      const response = await request(app).get('/api/tasks/non-existent-id').expect(404);

      expect(response.body.error.code).toBe('TASK_NOT_FOUND');
    });
  });

  describe('PATCH /api/tasks/:id/status', () => {
    it('should update task status following state machine', async () => {
      // Move from pending to in-progress
      const response1 = await request(app)
        .patch(`/api/tasks/${taskId}/status`)
        .send({ status: TaskStatus.IN_PROGRESS })
        .expect(200);

      expect(response1.body.status).toBe(TaskStatus.IN_PROGRESS);

      // Move from in-progress to completed
      const response2 = await request(app)
        .patch(`/api/tasks/${taskId}/status`)
        .send({ status: TaskStatus.COMPLETED })
        .expect(200);

      expect(response2.body.status).toBe(TaskStatus.COMPLETED);
      expect(response2.body.completedAt).toBeDefined();
    });

    it('should prevent invalid state transitions', async () => {
      // Try to skip from pending directly to completed
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const taskData = {
        title: 'Another Test Task',
        description: 'This is another test task',
        dueDate: tomorrow.toISOString(),
        priority: TaskPriority.MEDIUM,
        tags: ['test'],
      };

      const createResponse = await request(app).post('/api/tasks').send(taskData).expect(201);

      const newTaskId = createResponse.body.id;

      const response = await request(app)
        .patch(`/api/tasks/${newTaskId}/status`)
        .send({ status: TaskStatus.COMPLETED })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_STATE_TRANSITION');
    });
  });

  describe('PUT /api/tasks/:id', () => {
    it('should update task details', async () => {
      const updateData = {
        title: 'Updated Test Task',
        description: 'Updated description',
        priority: TaskPriority.LOW,
      };

      const response = await request(app).put(`/api/tasks/${taskId}`).send(updateData).expect(200);

      expect(response.body.title).toBe(updateData.title);
      expect(response.body.description).toBe(updateData.description);
      expect(response.body.priority).toBe(updateData.priority);
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('should delete a task', async () => {
      await request(app).delete(`/api/tasks/${taskId}`).expect(204);

      // Verify task is deleted
      await request(app).get(`/api/tasks/${taskId}`).expect(404);
    });
  });

  describe('High priority archive restriction', () => {
    it('should prevent archiving high priority tasks unless completed', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const taskData = {
        title: 'High Priority Task',
        description: 'This is a high priority task',
        dueDate: tomorrow.toISOString(),
        priority: TaskPriority.HIGH,
        tags: ['high-priority'],
      };

      const createResponse = await request(app).post('/api/tasks').send(taskData).expect(201);

      const highPriorityTaskId = createResponse.body.id;

      // Move to in-progress
      await request(app)
        .patch(`/api/tasks/${highPriorityTaskId}/status`)
        .send({ status: TaskStatus.IN_PROGRESS })
        .expect(200);

      // Try to archive without completing (should fail)
      const response = await request(app)
        .patch(`/api/tasks/${highPriorityTaskId}/status`)
        .send({ status: TaskStatus.ARCHIVED })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_STATE_TRANSITION');

      // Complete the task first
      await request(app)
        .patch(`/api/tasks/${highPriorityTaskId}/status`)
        .send({ status: TaskStatus.COMPLETED })
        .expect(200);

      // Now archiving should work
      await request(app)
        .patch(`/api/tasks/${highPriorityTaskId}/status`)
        .send({ status: TaskStatus.ARCHIVED })
        .expect(200);
    });
  });
});
