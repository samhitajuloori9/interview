import {
  TaskService,
  TaskValidationError,
  TaskNotFoundError,
  TaskStateError,
} from '../src/services/taskService';
import { TaskStatus, TaskPriority, CreateTaskRequest } from '../src/types/task';

describe('TaskService Unit Tests', () => {
  let taskService: TaskService;

  beforeEach(() => {
    taskService = TaskService.getInstance();
    taskService.clearAllTasks();
  });

  describe('Task Creation Validation', () => {
    it('should create task with valid data and defaults', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const request: CreateTaskRequest = {
        title: 'Test Task',
        description: 'Test description',
        dueDate: tomorrow.toISOString(),
        tags: ['test'],
      };

      const task = taskService.createTask(request);

      expect(task.title).toBe(request.title);
      expect(task.description).toBe(request.description);
      expect(task.status).toBe(TaskStatus.PENDING);
      expect(task.priority).toBe(TaskPriority.MEDIUM); // Default
      expect(task.tags).toEqual(['test']);
      expect(task.id).toBeDefined();
      expect(task.createdAt).toBeDefined();
      expect(task.updatedAt).toBeDefined();
    });

    it('should use provided priority instead of default', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const request: CreateTaskRequest = {
        title: 'High Priority Task',
        description: 'Important task',
        dueDate: tomorrow.toISOString(),
        priority: TaskPriority.HIGH,
        tags: ['urgent'],
      };

      const task = taskService.createTask(request);
      expect(task.priority).toBe(TaskPriority.HIGH);
    });

    it('should reject past due dates', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const request: CreateTaskRequest = {
        title: 'Past Due Task',
        description: 'This should fail',
        dueDate: yesterday.toISOString(),
        tags: ['test'],
      };

      expect(() => taskService.createTask(request)).toThrow(TaskValidationError);
      expect(() => taskService.createTask(request)).toThrow('Due date must be in the future');
    });

    it('should reject tasks without tags', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const request: CreateTaskRequest = {
        title: 'No Tags Task',
        description: 'This should fail',
        dueDate: tomorrow.toISOString(),
      };

      expect(() => taskService.createTask(request)).toThrow(TaskValidationError);
      expect(() => taskService.createTask(request)).toThrow('At least one tag is required');
    });

    it('should reject tasks with empty tags', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const request: CreateTaskRequest = {
        title: 'Empty Tags Task',
        description: 'This should fail',
        dueDate: tomorrow.toISOString(),
        tags: [''],
      };

      expect(() => taskService.createTask(request)).toThrow(TaskValidationError);
      expect(() => taskService.createTask(request)).toThrow('Tags cannot be empty');
    });
  });

  describe('State Machine Transitions', () => {
    let taskId: string;

    beforeEach(() => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const task = taskService.createTask({
        title: 'State Test Task',
        description: 'For testing state transitions',
        dueDate: tomorrow.toISOString(),
        tags: ['test'],
      });
      taskId = task.id;
    });

    it('should allow pending → in-progress', () => {
      const updatedTask = taskService.updateTaskStatus(taskId, TaskStatus.IN_PROGRESS);
      expect(updatedTask.status).toBe(TaskStatus.IN_PROGRESS);
    });

    it('should allow in-progress → completed and set completedAt', () => {
      taskService.updateTaskStatus(taskId, TaskStatus.IN_PROGRESS);
      const completedTask = taskService.updateTaskStatus(taskId, TaskStatus.COMPLETED);

      expect(completedTask.status).toBe(TaskStatus.COMPLETED);
      expect(completedTask.completedAt).toBeDefined();
      expect(completedTask.completedAt).toBeInstanceOf(Date);
    });

    it('should allow completed → archived', () => {
      taskService.updateTaskStatus(taskId, TaskStatus.IN_PROGRESS);
      taskService.updateTaskStatus(taskId, TaskStatus.COMPLETED);
      const archivedTask = taskService.updateTaskStatus(taskId, TaskStatus.ARCHIVED);

      expect(archivedTask.status).toBe(TaskStatus.ARCHIVED);
    });

    it('should reject invalid transitions', () => {
      // Try to skip from pending directly to completed
      expect(() => taskService.updateTaskStatus(taskId, TaskStatus.COMPLETED)).toThrow(
        TaskStateError
      );

      // Try to go backwards
      taskService.updateTaskStatus(taskId, TaskStatus.IN_PROGRESS);
      expect(() => taskService.updateTaskStatus(taskId, TaskStatus.PENDING)).toThrow(
        TaskStateError
      );
    });

    it('should prevent archiving high priority tasks unless completed', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const highPriorityTask = taskService.createTask({
        title: 'High Priority Task',
        description: 'Cannot archive unless completed',
        dueDate: tomorrow.toISOString(),
        priority: TaskPriority.HIGH,
        tags: ['urgent'],
      });

      taskService.updateTaskStatus(highPriorityTask.id, TaskStatus.IN_PROGRESS);

      // Should fail to archive directly from in-progress
      expect(() => taskService.updateTaskStatus(highPriorityTask.id, TaskStatus.ARCHIVED)).toThrow(
        TaskStateError
      );
      expect(() => taskService.updateTaskStatus(highPriorityTask.id, TaskStatus.ARCHIVED)).toThrow(
        'High priority tasks cannot be archived unless completed'
      );
    });

    it('should allow archiving high priority tasks after completion', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const highPriorityTask = taskService.createTask({
        title: 'High Priority Task',
        description: 'Can archive after completion',
        dueDate: tomorrow.toISOString(),
        priority: TaskPriority.HIGH,
        tags: ['urgent'],
      });

      taskService.updateTaskStatus(highPriorityTask.id, TaskStatus.IN_PROGRESS);
      taskService.updateTaskStatus(highPriorityTask.id, TaskStatus.COMPLETED);

      const archivedTask = taskService.updateTaskStatus(highPriorityTask.id, TaskStatus.ARCHIVED);
      expect(archivedTask.status).toBe(TaskStatus.ARCHIVED);
    });
  });

  describe('Advanced Filtering', () => {
    beforeEach(() => {
      // Create test tasks with different properties
      const baseDate = new Date();
      baseDate.setDate(baseDate.getDate() + 1);

      const tasks = [
        {
          title: 'Task 1',
          description: 'First task with urgent work',
          dueDate: new Date(baseDate.getTime() + 86400000).toISOString(), // +1 day
          priority: TaskPriority.HIGH,
          tags: ['urgent', 'work'],
        },
        {
          title: 'Task 2',
          description: 'Second task for personal stuff',
          dueDate: new Date(baseDate.getTime() + 172800000).toISOString(), // +2 days
          priority: TaskPriority.LOW,
          tags: ['personal'],
        },
        {
          title: 'Task 3',
          description: 'Third task about work project',
          dueDate: new Date(baseDate.getTime() + 259200000).toISOString(), // +3 days
          priority: TaskPriority.MEDIUM,
          tags: ['work', 'project'],
        },
      ];

      tasks.forEach((task) => taskService.createTask(task));
    });

    it('should filter by tags with OR logic', () => {
      const result = taskService.getTasksWithQuery({
        tags: ['urgent', 'personal'],
        tagsAll: false,
      });

      expect(result.data).toHaveLength(2);
      expect(result.data.some((task) => task.tags.includes('urgent'))).toBe(true);
      expect(result.data.some((task) => task.tags.includes('personal'))).toBe(true);
    });

    it('should filter by tags with AND logic', () => {
      const result = taskService.getTasksWithQuery({
        tags: ['work', 'project'],
        tagsAll: true,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].tags).toContain('work');
      expect(result.data[0].tags).toContain('project');
    });

    it('should search in title and description', () => {
      const result = taskService.getTasksWithQuery({
        search: 'work',
      });

      expect(result.data).toHaveLength(2);
      result.data.forEach((task) => {
        expect(
          task.title.toLowerCase().includes('work') ||
            task.description.toLowerCase().includes('work')
        ).toBe(true);
      });
    });

    it('should sort by priority descending', () => {
      const result = taskService.getTasksWithQuery({
        sort: 'priority',
        order: 'desc',
      });

      expect(result.data[0].priority).toBe(TaskPriority.HIGH);
      expect(result.data[1].priority).toBe(TaskPriority.MEDIUM);
      expect(result.data[2].priority).toBe(TaskPriority.LOW);
    });

    it('should paginate results', () => {
      const result = taskService.getTasksWithQuery({
        page: 1,
        pageSize: 2,
      });

      expect(result.data).toHaveLength(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.pageSize).toBe(2);
      expect(result.pagination.total).toBe(3);
      expect(result.pagination.totalPages).toBe(2);
    });

    it('should filter by date range', () => {
      const baseDate = new Date();
      baseDate.setDate(baseDate.getDate() + 1);

      const dueFrom = baseDate.toISOString(); // base date
      const dueTo = new Date(baseDate.getTime() + 172800000).toISOString(); // +2 days

      const result = taskService.getTasksWithQuery({
        dueFrom,
        dueTo,
      });

      expect(result.data).toHaveLength(2);
    });
  });
});
