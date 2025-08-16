import { Request, Response, NextFunction } from 'express';
import {
  TaskService,
  TaskValidationError,
  TaskNotFoundError,
  TaskStateError,
} from '../services/taskService';
import { TaskStatus, CreateTaskRequest, UpdateTaskRequest, TaskQueryParams } from '../types/task';

export class TaskController {
  private taskService: TaskService;

  constructor() {
    this.taskService = new TaskService();
  }

  createTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const createRequest: CreateTaskRequest = req.body;
      const task = this.taskService.createTask(createRequest);
      res.status(201).json(task);
    } catch (error) {
      next(error);
    }
  };

  getTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const task = this.taskService.getTask(id);
      res.json(task);
    } catch (error) {
      next(error);
    }
  };

  getAllTasks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const queryParams: TaskQueryParams = {
        status: req.query.status as TaskStatus,
        priority: req.query.priority as any,
        dueFrom: req.query.dueFrom as string,
        dueTo: req.query.dueTo as string,
        tags: Array.isArray(req.query.tags)
          ? (req.query.tags as string[])
          : req.query.tags
            ? [req.query.tags as string]
            : undefined,
        tagsAll: req.query.tagsAll === 'true',
        search: req.query.search as string,
        sort: req.query.sort as any,
        order: req.query.order as any,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined,
      };

      const result = this.taskService.getTasksWithQuery(queryParams);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  updateTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const updateRequest: UpdateTaskRequest = req.body;

      const task = this.taskService.updateTask(id, updateRequest);
      res.json(task);
    } catch (error) {
      next(error);
    }
  };

  updateTaskStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status || !Object.values(TaskStatus).includes(status)) {
        throw new TaskValidationError('Invalid or missing status');
      }

      const task = this.taskService.updateTaskStatus(id, status as TaskStatus);
      res.json(task);
    } catch (error) {
      next(error);
    }
  };

  deleteTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const force = req.query.force === 'true';
      this.taskService.deleteTask(id, force);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  // Dependency management endpoints
  setTaskDependencies = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { dependencies } = req.body;

      if (!Array.isArray(dependencies)) {
        throw new TaskValidationError('Dependencies must be an array of task IDs');
      }

      const task = this.taskService.setTaskDependencies(id, dependencies);
      res.json(task);
    } catch (error) {
      next(error);
    }
  };

  addTaskDependencies = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { dependencies } = req.body;

      if (!Array.isArray(dependencies)) {
        throw new TaskValidationError('Dependencies must be an array of task IDs');
      }

      const task = this.taskService.addTaskDependencies(id, dependencies);
      res.json(task);
    } catch (error) {
      next(error);
    }
  };

  removeTaskDependency = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id, depId } = req.params;
      const task = this.taskService.removeTaskDependency(id, depId);
      res.json(task);
    } catch (error) {
      next(error);
    }
  };
}
