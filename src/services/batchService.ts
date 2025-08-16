import { TaskService, TaskValidationError, TaskNotFoundError, TaskStateError } from './taskService';
import { BatchOperation, BatchOperationResult, BatchResponse } from '../types/batch';
import { Task, CreateTaskRequest, UpdateTaskRequest } from '../types/task';

interface QueuedBatch {
  operations: BatchOperation[];
  resolve: (result: BatchResponse) => void;
  reject: (error: Error) => void;
}

export class BatchService {
  private static instance: BatchService;
  private taskService!: TaskService;
  private batchQueue: QueuedBatch[] = [];
  private isProcessing = false;

  constructor() {
    if (BatchService.instance) {
      return BatchService.instance;
    }
    this.taskService = TaskService.getInstance();
    BatchService.instance = this;
  }

  static getInstance(): BatchService {
    if (!BatchService.instance) {
      BatchService.instance = new BatchService();
    }
    return BatchService.instance;
  }

  async processBatch(operations: BatchOperation[]): Promise<BatchResponse> {
    return new Promise((resolve, reject) => {
      this.batchQueue.push({ operations, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.batchQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    
    while (this.batchQueue.length > 0) {
      const batch = this.batchQueue.shift()!;
      try {
        const result = await this.executeBatch(batch.operations);
        batch.resolve(result);
      } catch (error) {
        batch.reject(error as Error);
      }
    }

    this.isProcessing = false;
  }

  private async executeBatch(operations: BatchOperation[]): Promise<BatchResponse> {
    // Create shadow copy of the task map
    const originalTasks = new Map(this.taskService.getAllTasksMap());
    const results: BatchOperationResult[] = [];

    try {
      // Execute all operations
      for (const operation of operations) {
        const result = await this.executeOperation(operation);
        results.push(result);
      }

      // If we get here, all operations succeeded
      return {
        committed: true,
        results
      };

    } catch (error) {
      // Rollback - restore original state
      this.taskService.restoreTasksMap(originalTasks);

      return {
        committed: false,
        results: [],
        error: {
          code: 'BATCH_ROLLBACK',
          message: 'Batch operation failed and was rolled back',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  private async executeOperation(operation: BatchOperation): Promise<BatchOperationResult> {
    try {
      switch (operation.op) {
        case 'create':
          if (!operation.data) {
            throw new TaskValidationError('Create operation requires data');
          }
          const createdTask = this.taskService.createTask(operation.data as CreateTaskRequest);
          return {
            op: 'create',
            id: createdTask.id,
            success: true,
            data: createdTask
          };

        case 'update':
          if (!operation.id || !operation.data) {
            throw new TaskValidationError('Update operation requires id and data');
          }
          const updatedTask = this.taskService.updateTask(operation.id, operation.data as UpdateTaskRequest);
          return {
            op: 'update',
            id: operation.id,
            success: true,
            data: updatedTask
          };

        case 'delete':
          if (!operation.id) {
            throw new TaskValidationError('Delete operation requires id');
          }
          this.taskService.deleteTask(operation.id, operation.force || false);
          return {
            op: 'delete',
            id: operation.id,
            success: true
          };

        default:
          throw new TaskValidationError(`Unknown operation: ${(operation as any).op}`);
      }
    } catch (error) {
      throw error; // Re-throw to trigger rollback
    }
  }
}
