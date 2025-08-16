import { Request, Response, NextFunction } from 'express';
import { BatchService } from '../services/batchService';
import { BatchRequest } from '../types/batch';

export class BatchController {
  private batchService: BatchService;

  constructor() {
    this.batchService = BatchService.getInstance();
  }

  processBatch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const batchRequest: BatchRequest = req.body;

      if (!batchRequest.operations || !Array.isArray(batchRequest.operations)) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Operations array is required'
          }
        });
        return;
      }

      if (batchRequest.operations.length === 0) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'At least one operation is required'
          }
        });
        return;
      }

      const result = await this.batchService.processBatch(batchRequest.operations);
      
      if (result.committed) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      next(error);
    }
  };
}
