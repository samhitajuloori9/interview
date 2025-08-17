import { Task, TaskPriority, TaskStatus, UpdateTaskRequest } from '../src/types/task';
import { TaskService } from '../src/services/taskService';

export const seedTestData = (): string[] => {
  const taskService = TaskService.getInstance();
  taskService.resetStore();
  
  const now = new Date();
  const taskIds: string[] = [];
  const priorities = Object.values(TaskPriority);
  const tags = ['frontend', 'backend', 'devops', 'design', 'documentation'];

  // Create completed tasks first to ensure we have some for analytics
  for (let i = 0; i < 30; i++) {
    // Create task with due date in the future (1-30 days from now)
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + Math.ceil(Math.random() * 30) + 1);
    
    // Set creation time in the past (1-30 days ago)
    const createdAt = new Date(now);
    createdAt.setDate(createdAt.getDate() - (i + 1));
    
    // Set completion time (1-24 hours after creation)
    const completedAt = new Date(createdAt);
    completedAt.setHours(completedAt.getHours() + Math.ceil(Math.random() * 24) + 1);
    
    const priority = priorities[Math.floor(Math.random() * priorities.length)] as TaskPriority;
    const tagCount = Math.min(Math.ceil(Math.random() * 3) + 1, tags.length);
    const taskTags = [...tags].sort(() => 0.5 - Math.random()).slice(0, tagCount);
    
    // Create task with required fields
    const task = taskService.createTask({
      title: `Completed Task ${i + 1}`,
      description: `Description for completed task ${i + 1}`,
      priority,
      tags: taskTags,
      dueDate: dueDate.toISOString(),
    });
    
    // Update with custom timestamps
    taskService.updateTask(task.id, {
      ...task,
      createdAt: createdAt.toISOString(),
      updatedAt: completedAt.toISOString(),
    } as any);
    
    // Update status to completed with proper state transitions
    taskService.updateTaskStatus(task.id, TaskStatus.IN_PROGRESS);
    const completedTask = taskService.updateTaskStatus(task.id, TaskStatus.COMPLETED);
    
    // Ensure completedAt is set
    taskService.updateTask(completedTask.id, {
      ...completedTask,
      completedAt: completedAt.toISOString(),
    } as any);
    
    taskIds.push(completedTask.id);
  }

  // Add some pending tasks
  for (let i = 0; i < 20; i++) {
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + Math.floor(Math.random() * 14) + 1); // Due in 1-14 days
    
    const priority = priorities[Math.floor(Math.random() * priorities.length)] as TaskPriority;
    const tagCount = Math.min(Math.ceil(Math.random() * 3) + 1, tags.length);
    const taskTags = [...tags].sort(() => 0.5 - Math.random()).slice(0, tagCount);
    
    // Create task with required fields
    const task = taskService.createTask({
      title: `Pending Task ${i + 1}`,
      description: `Description for pending task ${i + 1}`,
      priority,
      tags: taskTags,
      dueDate: dueDate.toISOString(),
    });
    
    // 30% chance of having dependencies
    if (Math.random() > 0.7 && taskIds.length > 0) {
      const depCount = Math.min(Math.floor(Math.random() * 3) + 1, taskIds.length);
      const dependencies = [...taskIds]
        .sort(() => 0.5 - Math.random())
        .slice(0, depCount);
      
      // Get the current task to ensure we have the correct types
      const currentTask = taskService.getAllTasks().find(t => t.id === task.id);
      
      if (currentTask) {
        // Ensure dueDate is a string
        const dueDate = typeof currentTask.dueDate === 'string' 
          ? currentTask.dueDate 
          : currentTask.dueDate.toISOString();
        
        // Update task with just the dependencies
        const updateData: UpdateTaskRequest = {
          title: currentTask.title,
          description: currentTask.description,
          priority: currentTask.priority,
          tags: currentTask.tags,
          dueDate,
          dependencies,
        };
        
        taskService.updateTask(task.id, updateData);
      }
    }
    
    taskIds.push(task.id);
  }
  
  return taskIds;
};

export const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
