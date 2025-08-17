import request from 'supertest';
import app from '../src/app';
import { TaskService } from '../src/services/taskService';
import { TaskStatus, TaskPriority } from '../src/types/task';
import { seedTestData, wait } from './testHelpers';

describe('Analytics Endpoints', () => {
  let taskService: TaskService;
  let taskIds: string[] = [];

  beforeAll(() => {
    taskService = TaskService.getInstance();
    // Seed test data
    taskIds = seedTestData();
  });

  afterAll(() => {
    // Clean up after tests
    taskService.resetStore();
  });

  describe('GET /api/analytics/completion-rate', () => {
    it('should return completion rates with default daily interval', async () => {
      const response = await request(app)
        .get('/api/analytics/completion-rate')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.interval).toBe('daily');
      
      // Should have at least one data point
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // Check data structure
      const dataPoint = response.body.data[0];
      expect(dataPoint).toHaveProperty('date');
      expect(dataPoint).toHaveProperty('completed');
      expect(dataPoint).toHaveProperty('total');
      expect(dataPoint).toHaveProperty('completionRate');
    });

    it('should return completion rates with weekly interval', async () => {
      const response = await request(app)
        .get('/api/analytics/completion-rate?interval=weekly')
        .expect(200);

      expect(response.body.interval).toBe('weekly');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return completion rates with monthly interval', async () => {
      const response = await request(app)
        .get('/api/analytics/completion-rate?interval=monthly')
        .expect(200);

      expect(response.body.interval).toBe('monthly');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter by date range', async () => {
      const now = new Date();
      const twoWeeksAgo = new Date(now);
      twoWeeksAgo.setDate(now.getDate() - 14);
      
      const from = twoWeeksAgo.toISOString().split('T')[0];
      const to = now.toISOString().split('T')[0];
      
      const response = await request(app)
        .get(`/api/analytics/completion-rate?from=${from}&to=${to}`)
        .expect(200);

      expect(response.body.from).toBe(from);
      expect(response.body.to).toBe(to);
    });

    it('should return 400 for invalid date format', async () => {
      const response = await request(app)
        .get('/api/analytics/completion-rate?from=invalid-date')
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_DATE');
    });
  });

  describe('GET /api/analytics/avg-completion-time', () => {
    it('should return average completion time overall', async () => {
      const response = await request(app)
        .get('/api/analytics/avg-completion-time')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].group).toBe('overall');
      expect(typeof response.body.data[0].avgCompletionTimeHours).toBe('number');
      expect(response.body.data[0].avgCompletionTimeHours).toBeGreaterThan(0);
    });

    it('should group average completion time by priority', async () => {
      const response = await request(app)
        .get('/api/analytics/avg-completion-time?groupBy=priority')
        .expect(200);

      expect(response.body.groupBy).toBe('priority');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // Should have entries for each priority
      const priorities = new Set(response.body.data.map((item: any) => item.group));
      expect(priorities.has(TaskPriority.LOW)).toBe(true);
      expect(priorities.has(TaskPriority.MEDIUM)).toBe(true);
      expect(priorities.has(TaskPriority.HIGH)).toBe(true);
    });
  });

  describe('GET /api/analytics/top-tags', () => {
    it('should return top tags with default limit', async () => {
      const response = await request(app)
        .get('/api/analytics/top-tags')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.limit).toBe(10);
      expect(typeof response.body.totalTags).toBe('number');
    });

    it('should respect the limit parameter', async () => {
      const response = await request(app)
        .get('/api/analytics/top-tags?limit=3')
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(3);
      expect(response.body.limit).toBe(3);
    });

    it('should return 400 for invalid limit', async () => {
      const response = await request(app)
        .get('/api/analytics/top-tags?limit=0')
        .expect(400);
      
      expect(response.body).toMatchObject({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Limit must be a number between 1 and 100'
        }
      });
      
      await request(app)
        .get('/api/analytics/top-tags?limit=101')
        .expect(400);
    });
  });
});
