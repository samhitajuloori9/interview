import { Task } from './task';

declare global {
  namespace Express {
    interface Request {
      task?: Task;
    }
  }
}
