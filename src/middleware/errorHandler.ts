import { Request, Response, NextFunction } from 'express';
import { TaskValidationError, TaskNotFoundError, TaskStateError } from '../services/taskService';
import { ErrorResponse } from '../types/task';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected error occurred';
  let details: any = undefined;

  if (error instanceof TaskValidationError) {
    statusCode = 400;
    errorCode = error.code || 'VALIDATION_ERROR';
    message = error.message;
  } else if (error instanceof TaskNotFoundError) {
    statusCode = 404;
    errorCode = 'TASK_NOT_FOUND';
    message = error.message;
  } else if (error instanceof TaskStateError) {
    statusCode = 400;
    errorCode = 'INVALID_STATE_TRANSITION';
    message = error.message;
  } else if (error.name === 'SyntaxError') {
    statusCode = 400;
    errorCode = 'INVALID_JSON';
    message = 'Invalid JSON in request body';
  } else {
    // Log unexpected errors for debugging
    console.error('Unexpected error:', error);
    details = process.env.NODE_ENV === 'development' ? error.stack : undefined;
  }

  const errorResponse: ErrorResponse = {
    error: {
      code: errorCode,
      message,
      ...(details && { details }),
    },
  };

  res.status(statusCode).json(errorResponse);
};
