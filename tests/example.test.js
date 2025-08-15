const request = require('supertest');
const app = require('../src/app');

describe('API Endpoints', () => {
  describe('GET /', () => {
    it('should return welcome message', async () => {
      const res = await request(app).get('/');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message');
    });
  });

  // TODO: Add your test cases here
  // Example test structure:
  /*
  describe('POST /api/tasks', () => {
    it('should create a new task', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({
          // Add test data here
        });

      expect(res.statusCode).toBe(201);
      // Add more assertions
    });
  });
  */
});
