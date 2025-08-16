import { Task, CreateTaskRequest, UpdateTaskRequest } from './task';

export interface BatchOperation {
  op: 'create' | 'update' | 'delete';
  id?: string;
  data?: CreateTaskRequest | UpdateTaskRequest;
  force?: boolean;
}

export interface BatchRequest {
  operations: BatchOperation[];
}

export interface BatchOperationResult {
  op: string;
  id?: string;
  success: boolean;
  data?: Task;
  error?: string;
}

export interface BatchResponse {
  committed: boolean;
  results: BatchOperationResult[];
  error?: {
    code: string;
    message: string;
    details?: string;
  };
}
