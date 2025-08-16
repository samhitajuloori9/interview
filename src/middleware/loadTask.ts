import { Request, Response, NextFunction } from 'express';
import { TaskService } from '../services/taskService';

const taskService = new TaskService();

export const loadTaskById = (paramName: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction, value: string) => {
    try {
      const task = taskService.getTask(value);
      (req as any).task = task;
      next();
    } catch (error) {
      return res.status(404).json({
        error: {
          code: 'TASK_NOT_FOUND',
          message: 'Task not found'
        }
      });
    }
  };
};
