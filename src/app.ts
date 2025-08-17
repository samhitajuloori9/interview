import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { specs } from './config/swagger';
import taskRoutes from './routes/taskRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import { errorHandler } from './middleware/errorHandler';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Swagger documentation
app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs));

// Welcome route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Summit Tasks API',
    documentation: '/docs',
  });
});

// API routes
app.use('/api/tasks', taskRoutes);
app.use('/api/analytics', analyticsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found',
    },
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`Summit Tasks API is running on port ${port}`);
    console.log(`Documentation available at http://localhost:${port}/docs`);
  });
}

export default app;
