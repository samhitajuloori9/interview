import {
  Task,
  TaskStatus,
  TaskPriority,
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskQueryParams,
  PaginatedResponse,
} from '../types/task';
import { v4 as uuidv4 } from 'uuid';
import { wouldCreateCycle, getDependents, areAllDependenciesCompleted, GraphNode } from '../utils/graph';

export class TaskValidationError extends Error {
  constructor(
    message: string,
    public code: string = 'VALIDATION_ERROR'
  ) {
    super(message);
    this.name = 'TaskValidationError';
  }
}

export class TaskNotFoundError extends Error {
  constructor(id: string) {
    super(`Task with id ${id} not found`);
    this.name = 'TaskNotFoundError';
  }
}

export class TaskStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TaskStateError';
  }
}

export class TaskService {
  private static instance: TaskService;
  private tasks: Map<string, Task> = new Map();

  constructor() {
    if (TaskService.instance) {
      return TaskService.instance;
    }
    TaskService.instance = this;
  }

  static getInstance(): TaskService {
    if (!TaskService.instance) {
      TaskService.instance = new TaskService();
    }
    return TaskService.instance;
  }

  // Batch operation support methods
  getAllTasksMap(): Map<string, Task> {
    return new Map(this.tasks);
  }

  restoreTasksMap(tasksMap: Map<string, Task>): void {
    this.tasks = new Map(tasksMap);
  }

  // Method to clear all tasks (for testing)
  clearAllTasks(): void {
    this.tasks.clear();
  }

  // Method to reset store for testing
  resetStore(): void {
    this.tasks.clear();
  }

  private validateStateTransition(currentStatus: TaskStatus, newStatus: TaskStatus): void {
    const validTransitions: Record<TaskStatus, TaskStatus[]> = {
      [TaskStatus.PENDING]: [TaskStatus.IN_PROGRESS],
      [TaskStatus.IN_PROGRESS]: [TaskStatus.COMPLETED],
      [TaskStatus.COMPLETED]: [TaskStatus.ARCHIVED],
      [TaskStatus.ARCHIVED]: [],
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new TaskStateError(`Invalid state transition from ${currentStatus} to ${newStatus}`);
    }
  }

  private validateArchiveCondition(task: Task): void {
    if (task.priority === TaskPriority.HIGH && task.status !== TaskStatus.COMPLETED) {
      throw new TaskStateError('High priority tasks cannot be archived unless completed');
    }
  }

  private validateCreateRequest(request: CreateTaskRequest): void {
    // Validate future due date
    const dueDate = new Date(request.dueDate);
    const now = new Date();
    if (dueDate <= now) {
      throw new TaskValidationError('Due date must be in the future');
    }

    // Validate at least 1 tag
    if (!request.tags || request.tags.length === 0) {
      throw new TaskValidationError('At least one tag is required');
    }

    // Validate tags are non-empty strings
    if (request.tags.some((tag) => !tag.trim())) {
      throw new TaskValidationError('Tags cannot be empty');
    }
  }

  createTask(request: CreateTaskRequest): Task {
    this.validateCreateRequest(request);

    const id = uuidv4();
    const now = new Date();

    const task: Task = {
      id,
      title: request.title,
      description: request.description,
      dueDate: new Date(request.dueDate),
      status: TaskStatus.PENDING,
      priority: request.priority || TaskPriority.MEDIUM, // Default to medium
      tags: request.tags || [],
      dependencies: request.dependencies || [],
      createdAt: now,
      updatedAt: now,
    };

    this.tasks.set(id, task);
    return task;
  }

  getTask(id: string): Task {
    const task = this.tasks.get(id);
    if (!task) {
      throw new TaskNotFoundError(id);
    }
    return task;
  }

  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  updateTask(id: string, request: UpdateTaskRequest): Task {
    const task = this.getTask(id);

    // Check for self-dependency
    if (request.dependencies?.includes(id)) {
      throw new TaskValidationError(
        'A task cannot depend on itself',
        'SELF_DEPENDENCY'
      );
    }

    const updatedTask: Task = {
      ...task,
      ...(request.title && { title: request.title }),
      ...(request.description && { description: request.description }),
      ...(request.dueDate && { dueDate: new Date(request.dueDate) }),
      ...(request.priority && { priority: request.priority }),
      ...(request.tags && { tags: request.tags }),
      ...(request.dependencies && { dependencies: request.dependencies }),
      updatedAt: new Date(),
    };

    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  updateTaskStatus(id: string, newStatus: TaskStatus): Task {
    const task = this.getTask(id);

    // Check if task can be completed (all dependencies must be completed)
    if (newStatus === TaskStatus.COMPLETED) {
      const allTasks = Array.from(this.tasks.values());
      const graphNodes = allTasks.map(t => ({
        id: t.id,
        dependencies: t.dependencies,
        completed: t.status === TaskStatus.COMPLETED
      }));
      
      if (!areAllDependenciesCompleted(graphNodes, id)) {
        throw new TaskValidationError(
          'Cannot complete task while dependencies are incomplete',
          'BLOCKED_BY_DEPENDENCIES'
        );
      }
    }

    // Special validation for archiving high priority tasks (check before state transition)
    if (
      newStatus === TaskStatus.ARCHIVED &&
      task.priority === TaskPriority.HIGH &&
      task.status !== TaskStatus.COMPLETED
    ) {
      throw new TaskStateError('High priority tasks cannot be archived unless completed');
    }

    // Validate state transition
    this.validateStateTransition(task.status, newStatus);

    const now = new Date();
    const updatedTask: Task = {
      ...task,
      status: newStatus,
      updatedAt: now,
      // Set completedAt when entering completed status
      ...(newStatus === TaskStatus.COMPLETED && !task.completedAt && { completedAt: now }),
    };

    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  deleteTask(id: string, force: boolean = false): void {
    if (!this.tasks.has(id)) {
      throw new TaskNotFoundError(id);
    }

    // Check if task is referenced as a dependency by others
    if (!force) {
      const allTasks = Array.from(this.tasks.values());
      const dependents = getDependents(allTasks, id);
      
      if (dependents.length > 0) {
        throw new TaskValidationError(
          `Cannot delete task: it is referenced as a dependency by tasks ${dependents.join(', ')}. Use force=true to unlink and delete.`,
          'TASK_HAS_DEPENDENTS'
        );
      }
    } else {
      // Force delete: remove this task from all dependency lists
      this.tasks.forEach((task, taskId) => {
        if (task.dependencies.includes(id)) {
          const updatedTask = {
            ...task,
            dependencies: task.dependencies.filter(depId => depId !== id),
            updatedAt: new Date()
          };
          this.tasks.set(taskId, updatedTask);
        }
      });
    }

    this.tasks.delete(id);
  }

  private filterTasks(tasks: Task[], params: TaskQueryParams): Task[] {
    let filtered = tasks;

    // Filter by status
    if (params.status) {
      filtered = filtered.filter((task) => task.status === params.status);
    }

    // Filter by priority
    if (params.priority) {
      filtered = filtered.filter((task) => task.priority === params.priority);
    }

    // Filter by due date range
    if (params.dueFrom) {
      const dueFrom = new Date(params.dueFrom);
      filtered = filtered.filter((task) => task.dueDate >= dueFrom);
    }
    if (params.dueTo) {
      const dueTo = new Date(params.dueTo);
      filtered = filtered.filter((task) => task.dueDate <= dueTo);
    }

    // Filter by tags
    if (params.tags && params.tags.length > 0) {
      if (params.tagsAll) {
        // AND logic - task must have ALL specified tags
        filtered = filtered.filter((task) => params.tags!.every((tag) => task.tags.includes(tag)));
      } else {
        // OR logic - task must have ANY of the specified tags
        filtered = filtered.filter((task) => params.tags!.some((tag) => task.tags.includes(tag)));
      }
    }

    // Search in title and description
    if (params.search) {
      const searchLower = params.search.toLowerCase();
      filtered = filtered.filter(
        (task) =>
          task.title.toLowerCase().includes(searchLower) ||
          task.description.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }

  private sortTasks(tasks: Task[], sortBy?: string, order?: string): Task[] {
    if (!sortBy) return tasks;

    const sorted = [...tasks].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'dueDate':
          comparison = a.dueDate.getTime() - b.dueDate.getTime();
          break;
        case 'priority':
          const priorityOrder = {
            [TaskPriority.HIGH]: 3,
            [TaskPriority.MEDIUM]: 2,
            [TaskPriority.LOW]: 1,
          };
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        case 'createdAt':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        default:
          return 0;
      }

      return order === 'desc' ? -comparison : comparison;
    });

    return sorted;
  }

  private paginateTasks(tasks: Task[], page?: number, pageSize?: number): PaginatedResponse<Task> {
    const currentPage = page || 1;
    const size = pageSize || 10;
    const startIndex = (currentPage - 1) * size;
    const endIndex = startIndex + size;

    const paginatedTasks = tasks.slice(startIndex, endIndex);

    return {
      data: paginatedTasks,
      pagination: {
        page: currentPage,
        pageSize: size,
        total: tasks.length,
        totalPages: Math.ceil(tasks.length / size),
      },
    };
  }

  getTasksWithQuery(params: TaskQueryParams): PaginatedResponse<Task> {
    let tasks = Array.from(this.tasks.values());

    // Apply filters
    tasks = this.filterTasks(tasks, params);

    // Apply sorting
    tasks = this.sortTasks(tasks, params.sort, params.order);

    // Apply pagination
    return this.paginateTasks(tasks, params.page, params.pageSize);
  }

  getTasksByStatus(status: TaskStatus): Task[] {
    return Array.from(this.tasks.values()).filter((task) => task.status === status);
  }

  getTasksByPriority(priority: TaskPriority): Task[] {
    return Array.from(this.tasks.values()).filter((task) => task.priority === priority);
  }

  // Dependency management methods
  setTaskDependencies(id: string, dependencies: string[]): Task {
    const task = this.getTask(id);
    
    // Validate all dependency IDs exist
    for (const depId of dependencies) {
      if (!this.tasks.has(depId)) {
        throw new TaskNotFoundError(depId);
      }
    }

    // Check for self-dependency
    if (dependencies.includes(id)) {
      throw new TaskValidationError('Task cannot depend on itself', 'SELF_DEPENDENCY');
    }

    // Check for cycles
    const allTasks = Array.from(this.tasks.values());
    const graphNodes: GraphNode[] = allTasks.map(t => ({
      id: t.id,
      dependencies: t.id === id ? dependencies : t.dependencies
    }));

    for (const depId of dependencies) {
      if (wouldCreateCycle(graphNodes, id, depId)) {
        throw new TaskValidationError('Adding dependency would create a cycle', 'DEPENDENCY_CYCLE');
      }
    }

    const updatedTask: Task = {
      ...task,
      dependencies,
      updatedAt: new Date(),
    };

    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  addTaskDependencies(id: string, newDependencies: string[]): Task {
    const task = this.getTask(id);
    const currentDeps = task.dependencies || [];
    const allDeps = [...new Set([...currentDeps, ...newDependencies])]; // Remove duplicates
    
    return this.setTaskDependencies(id, allDeps);
  }

  removeTaskDependency(id: string, dependencyId: string): Task {
    const task = this.getTask(id);
    const updatedDependencies = task.dependencies.filter(depId => depId !== dependencyId);
    
    const updatedTask: Task = {
      ...task,
      dependencies: updatedDependencies,
      updatedAt: new Date(),
    };

    this.tasks.set(id, updatedTask);
    return updatedTask;
  }
}
