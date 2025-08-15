export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: Date;
  status: TaskStatus;
  priority: TaskPriority;
  tags: string[];
  dependencies: string[];
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface CreateTaskRequest {
  title: string;
  description: string;
  dueDate: string;
  priority?: TaskPriority;
  tags?: string[];
  dependencies?: string[];
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  dueDate?: string;
  priority?: TaskPriority;
  tags?: string[];
  dependencies?: string[];
}

export interface TaskQueryParams {
  status?: TaskStatus;
  priority?: TaskPriority;
  dueFrom?: string;
  dueTo?: string;
  tags?: string[];
  tagsAll?: boolean;
  search?: string;
  sort?: 'dueDate' | 'priority' | 'createdAt';
  order?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}
