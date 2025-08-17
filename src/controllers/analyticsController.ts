import { Request, Response } from 'express';
import { TaskService } from '../services/taskService';
import { 
  calculateCompletionRates, 
  calculateAverageCompletionTime, 
  getTopTags,
  TimeInterval
} from '../utils/analytics';

export class AnalyticsController {
  private taskService: TaskService;

  constructor() {
    this.taskService = TaskService.getInstance();
  }

  getCompletionRates = async (req: Request, res: Response) => {
    try {
      const { interval, from, to } = req.query;
      
      // Validate interval
      const validIntervals: TimeInterval[] = ['daily', 'weekly', 'monthly'];
      const timeInterval = validIntervals.includes(interval as TimeInterval) 
        ? interval as TimeInterval 
        : 'daily';
      
      // Parse and validate dates
      const now = new Date();
      let fromDate: Date | undefined;
      let toDate: Date | undefined;
      
      if (from) {
        fromDate = new Date(from as string);
        if (isNaN(fromDate.getTime())) {
          return res.status(400).json({
            error: {
              code: 'INVALID_DATE',
              message: 'Invalid from date format. Use ISO 8601 format (e.g., 2023-01-01).'
            }
          });
        }
      } else {
        // Default to 30 days ago if no from date provided
        fromDate = new Date(now);
        fromDate.setDate(fromDate.getDate() - 30);
      }
      
      if (to) {
        toDate = new Date(to as string);
        if (isNaN(toDate.getTime())) {
          return res.status(400).json({
            error: {
              code: 'INVALID_DATE',
              message: 'Invalid to date format. Use ISO 8601 format (e.g., 2023-12-31).'
            }
          });
        }
      } else {
        // Default to now if no to date provided
        toDate = now;
      }
      
      // Ensure from date is before to date
      if (fromDate > toDate) {
        return res.status(400).json({
          error: {
            code: 'INVALID_DATE_RANGE',
            message: 'From date must be before to date.'
          }
        });
      }
      
      // Get all tasks
      const tasks = this.taskService.getAllTasks();
      
      // Calculate completion rates
      const completionRates = calculateCompletionRates(
        tasks,
        timeInterval,
        fromDate,
        toDate
      );
      
      res.json({
        data: completionRates,
        interval: timeInterval,
        from: fromDate?.toISOString().split('T')[0] || 'start',
        to: toDate?.toISOString().split('T')[0] || 'now'
      });
      
    } catch (error) {
      console.error('Error in getCompletionRates:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while calculating completion rates.'
        }
      });
    }
  };

  getAverageCompletionTime = async (req: Request, res: Response) => {
    try {
      const groupBy = req.query.groupBy as 'priority' | 'overall' | undefined;
      const validGroups = ['priority', 'overall'];
      const group = validGroups.includes(groupBy as string) 
        ? groupBy as 'priority' | 'overall' 
        : 'overall';

      const tasks = this.taskService.getAllTasks();
      const result = calculateAverageCompletionTime(tasks, group);
      
      res.json(result);
    } catch (error) {
      console.error('Error in getAverageCompletionTime:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while calculating average completion time.'
        }
      });
    }
  };

  getTopTags = async (req: Request, res: Response) => {
    try {
      // Parse and validate limit parameter
      const limit = req.query.limit !== undefined 
        ? parseInt(req.query.limit as string, 10)
        : 10;
      
      // Check if limit is a valid number between 1 and 100
      if (isNaN(limit) || limit < 1 || limit > 100) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Limit must be a number between 1 and 100'
          }
        });
      }

      const tasks = this.taskService.getAllTasks();
      const topTags = getTopTags(tasks, limit);
      
      return res.json({
        data: topTags,
        limit,
        totalTags: new Set(tasks.flatMap(t => t.tags || [])).size
      });
      
    } catch (error) {
      console.error('Error in getTopTags:', error);
      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while retrieving top tags.'
        }
      });
    }
  };
}

export default new AnalyticsController();
