import request from 'supertest';
import app from '../src/app';
import { TaskStatus, TaskPriority } from '../src/types/task';
import { TaskService } from '../src/services/taskService';

// Get the singleton instance to clear data between tests
const taskService = TaskService.getInstance();

describe('Task Integration Tests - Core Flows', () => {
  beforeEach(() => {
    // Clear all tasks before each test to ensure isolation
    taskService.clearAllTasks();
  });

  describe('Complete Task Lifecycle', () => {
    let taskId: string;

    it('should create, update, transition, and delete a task through complete lifecycle', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      // 1. Create task with validation
      const createResponse = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Integration Test Task',
          description: 'Testing complete lifecycle',
          dueDate: tomorrow.toISOString(),
          priority: TaskPriority.HIGH,
          tags: ['integration', 'test'],
        })
        .expect(201);

      taskId = createResponse.body.id;
      expect(createResponse.body.status).toBe(TaskStatus.PENDING);
      expect(createResponse.body.priority).toBe(TaskPriority.HIGH);
      expect(createResponse.body.tags).toEqual(['integration', 'test']);

      // 2. Update task details
      const updateResponse = await request(app)
        .put(`/api/tasks/${taskId}`)
        .send({
          title: 'Updated Integration Test Task',
          description: 'Updated description',
          tags: ['integration', 'test', 'updated'],
        })
        .expect(200);

      expect(updateResponse.body.title).toBe('Updated Integration Test Task');
      expect(updateResponse.body.tags).toEqual(['integration', 'test', 'updated']);

      // 3. Transition through state machine
      // pending → in-progress
      const inProgressResponse = await request(app)
        .patch(`/api/tasks/${taskId}/status`)
        .send({ status: TaskStatus.IN_PROGRESS })
        .expect(200);

      expect(inProgressResponse.body.status).toBe(TaskStatus.IN_PROGRESS);

      // in-progress → completed (should set completedAt)
      const completedResponse = await request(app)
        .patch(`/api/tasks/${taskId}/status`)
        .send({ status: TaskStatus.COMPLETED })
        .expect(200);

      expect(completedResponse.body.status).toBe(TaskStatus.COMPLETED);
      expect(completedResponse.body.completedAt).toBeDefined();

      // completed → archived (high priority should work after completion)
      const archivedResponse = await request(app)
        .patch(`/api/tasks/${taskId}/status`)
        .send({ status: TaskStatus.ARCHIVED })
        .expect(200);

      expect(archivedResponse.body.status).toBe(TaskStatus.ARCHIVED);

      // 4. Verify task can be retrieved
      const getResponse = await request(app).get(`/api/tasks/${taskId}`).expect(200);

      expect(getResponse.body.status).toBe(TaskStatus.ARCHIVED);

      // 5. Delete task
      await request(app).delete(`/api/tasks/${taskId}`).expect(204);

      // 6. Verify task is deleted
      await request(app).get(`/api/tasks/${taskId}`).expect(404);
    });
  });

  describe('Validation Flows', () => {
    it('should enforce future due date validation', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const response = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Past Due Task',
          description: 'This should fail',
          dueDate: yesterday.toISOString(),
          tags: ['test'],
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('Due date must be in the future');
    });

    it('should enforce tag requirement', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await request(app)
        .post('/api/tasks')
        .send({
          title: 'No Tags Task',
          description: 'This should fail',
          dueDate: tomorrow.toISOString(),
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('At least one tag is required');
    });

    it('should apply default priority when not specified', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Default Priority Task',
          description: 'Should get medium priority',
          dueDate: tomorrow.toISOString(),
          tags: ['default'],
        })
        .expect(201);

      expect(response.body.priority).toBe(TaskPriority.MEDIUM);
    });
  });

  describe('State Machine Enforcement', () => {
    let taskId: string;

    beforeEach(async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await request(app)
        .post('/api/tasks')
        .send({
          title: 'State Machine Test',
          description: 'For testing transitions',
          dueDate: tomorrow.toISOString(),
          tags: ['state-test'],
        });

      taskId = response.body.id;
    });

    it('should prevent invalid state transitions', async () => {
      // Try to skip from pending to completed
      const response = await request(app)
        .patch(`/api/tasks/${taskId}/status`)
        .send({ status: TaskStatus.COMPLETED })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_STATE_TRANSITION');
    });

    it('should prevent backwards transitions', async () => {
      // Move to in-progress first
      await request(app)
        .patch(`/api/tasks/${taskId}/status`)
        .send({ status: TaskStatus.IN_PROGRESS })
        .expect(200);

      // Try to go back to pending
      const response = await request(app)
        .patch(`/api/tasks/${taskId}/status`)
        .send({ status: TaskStatus.PENDING })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_STATE_TRANSITION');
    });
  });

  describe('High Priority Archive Restriction', () => {
    it('should prevent archiving high priority tasks unless completed', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Create high priority task
      const createResponse = await request(app)
        .post('/api/tasks')
        .send({
          title: 'High Priority Archive Test',
          description: 'Cannot archive unless completed',
          dueDate: tomorrow.toISOString(),
          priority: TaskPriority.HIGH,
          tags: ['high-priority'],
        })
        .expect(201);

      const taskId = createResponse.body.id;

      // Move to in-progress
      await request(app)
        .patch(`/api/tasks/${taskId}/status`)
        .send({ status: TaskStatus.IN_PROGRESS })
        .expect(200);

      // Try to archive directly (should fail)
      const archiveResponse = await request(app)
        .patch(`/api/tasks/${taskId}/status`)
        .send({ status: TaskStatus.ARCHIVED })
        .expect(400);

      expect(archiveResponse.body.error.code).toBe('INVALID_STATE_TRANSITION');
    });
  });

  describe('Advanced Filtering and Pagination', () => {
    beforeEach(async () => {
      // Create multiple test tasks
      const baseDate = new Date();
      baseDate.setDate(baseDate.getDate() + 1);

      const tasks = [
        {
          title: 'Urgent Work Task',
          description: 'Important work item',
          dueDate: new Date(baseDate.getTime() + 86400000).toISOString(),
          priority: TaskPriority.HIGH,
          tags: ['urgent', 'work'],
        },
        {
          title: 'Personal Task',
          description: 'Personal todo item',
          dueDate: new Date(baseDate.getTime() + 172800000).toISOString(),
          priority: TaskPriority.LOW,
          tags: ['personal'],
        },
        {
          title: 'Work Project',
          description: 'Project related work',
          dueDate: new Date(baseDate.getTime() + 259200000).toISOString(),
          priority: TaskPriority.MEDIUM,
          tags: ['work', 'project'],
        },
      ];

      for (const task of tasks) {
        await request(app).post('/api/tasks').send(task);
      }
    });

    it('should filter by tags with OR logic', async () => {
      const response = await request(app).get('/api/tasks?tags=urgent&tags=personal').expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination.total).toBe(2);
    });

    it('should filter by tags with AND logic', async () => {
      const response = await request(app)
        .get('/api/tasks?tags=work&tags=project&tagsAll=true')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].tags).toContain('work');
      expect(response.body.data[0].tags).toContain('project');
    });

    it('should search in title and description', async () => {
      const response = await request(app).get('/api/tasks?search=work').expect(200);

      expect(response.body.data).toHaveLength(2);
      response.body.data.forEach((task: any) => {
        expect(
          task.title.toLowerCase().includes('work') ||
            task.description.toLowerCase().includes('work')
        ).toBe(true);
      });
    });

    it('should sort by priority descending', async () => {
      const response = await request(app).get('/api/tasks?sort=priority&order=desc').expect(200);

      const priorities = response.body.data.map((task: any) => task.priority);
      expect(priorities[0]).toBe(TaskPriority.HIGH);
      expect(priorities[priorities.length - 1]).toBe(TaskPriority.LOW);
    });

    it('should paginate results correctly', async () => {
      const response = await request(app).get('/api/tasks?page=1&pageSize=2').expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.pageSize).toBe(2);
      expect(response.body.pagination.total).toBe(3);
      expect(response.body.pagination.totalPages).toBe(2);
    });

    it('should filter by status', async () => {
      // All tasks start as pending
      const response = await request(app).get('/api/tasks?status=pending').expect(200);

      expect(response.body.data).toHaveLength(3);
      response.body.data.forEach((task: any) => {
        expect(task.status).toBe(TaskStatus.PENDING);
      });
    });

    it('should filter by priority', async () => {
      const response = await request(app).get('/api/tasks?priority=high').expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].priority).toBe(TaskPriority.HIGH);
    });

    it('should combine multiple filters', async () => {
      const response = await request(app)
        .get('/api/tasks?tags=work&priority=high&search=urgent')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      const task = response.body.data[0];
      expect(task.tags).toContain('work');
      expect(task.priority).toBe(TaskPriority.HIGH);
      expect(task.title.toLowerCase()).toContain('urgent');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent task', async () => {
      const response = await request(app).get('/api/tasks/non-existent-id').expect(404);

      expect(response.body.error.code).toBe('TASK_NOT_FOUND');
    });

    it('should return 400 for invalid JSON', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_JSON');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Incomplete Task',
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('Missing required fields');
    });
  });
});
