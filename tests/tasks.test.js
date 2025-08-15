const request = require('supertest');
const app = require('../src/app');
const { TaskStatus, TaskPriority } = require('../src/models/task');

describe('Tasks API', () => {
  let createdTaskId;

  const sampleTask = {
    title: 'Test Task',
    description: 'Test Description',
    dueDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    priority: TaskPriority.MEDIUM,
    tags: ['test', 'sample'],
  };

  describe('POST /api/tasks', () => {
    it('should create a new task', async () => {
      const res = await request(app).post('/api/tasks').send(sampleTask);

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe(sampleTask.title);
      expect(res.body.status).toBe(TaskStatus.PENDING);

      createdTaskId = res.body.id;
    });

    it('should validate required fields', async () => {
      const res = await request(app).post('/api/tasks').send({});

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject past due dates', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({
          ...sampleTask,
          dueDate: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /api/tasks', () => {
    it('should return all tasks with pagination', async () => {
      const res = await request(app).get('/api/tasks').query({ page: 1, limit: 10 });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('tasks');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.tasks)).toBeTruthy();
    });

    it('should filter tasks by status', async () => {
      const res = await request(app).get('/api/tasks').query({ status: TaskStatus.PENDING });

      expect(res.statusCode).toBe(200);
      expect(res.body.tasks.every((task) => task.status === TaskStatus.PENDING)).toBeTruthy();
    });
  });

  describe('PUT /api/tasks/:id', () => {
    it('should update task status following valid transitions', async () => {
      const res = await request(app).put(`/api/tasks/${createdTaskId}`).send({
        status: TaskStatus.IN_PROGRESS,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe(TaskStatus.IN_PROGRESS);
    });

    it('should reject invalid status transitions', async () => {
      const res = await request(app).put(`/api/tasks/${createdTaskId}`).send({
        status: TaskStatus.ARCHIVED,
      });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /api/tasks/analytics', () => {
    it('should return completion rate', async () => {
      const res = await request(app).get('/api/tasks/analytics/completion-rate');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('completionRate');
    });

    it('should return popular tags', async () => {
      const res = await request(app).get('/api/tasks/analytics/popular-tags');

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBeTruthy();
    });
  });
});
