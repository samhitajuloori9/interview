const Joi = require('joi');
const { TaskStatus, TaskPriority, VALID_STATUS_TRANSITIONS } = require('../models/task');
const { TaskService } = require('../services/taskService');

const taskSchema = Joi.object({
  title: Joi.string().required().trim(),
  description: Joi.string().required().trim(),
  dueDate: Joi.date().greater('now').required(),
  status: Joi.string()
    .valid(...Object.values(TaskStatus))
    .default(TaskStatus.PENDING),
  priority: Joi.string()
    .valid(...Object.values(TaskPriority))
    .default(TaskPriority.MEDIUM),
  tags: Joi.array().items(Joi.string()).min(1).required(),
  dependencies: Joi.array().items(Joi.string()).default([]),
});

const updateTaskSchema = Joi.object({
  title: Joi.string().trim(),
  description: Joi.string().trim(),
  dueDate: Joi.date().greater('now'),
  status: Joi.string()
    .valid(...Object.values(TaskStatus)),
  priority: Joi.string()
    .valid(...Object.values(TaskPriority)),
  tags: Joi.array().items(Joi.string()).min(1),
  dependencies: Joi.array().items(Joi.string()),
});

exports.validateTask = (req, res, next) => {
  const { error } = taskSchema.validate(req.body, { abortEarly: false });

  if (error) {
    const firstError = error.details[0];
    let message = 'Validation failed';
    
    // Special handling for tags field
    if (firstError.path.includes('tags')) {
      if (firstError.type === 'any.required') {
        message = 'At least one tag is required';
      } else if (firstError.type === 'array.min') {
        message = 'At least one tag is required';
      }
    } else if (firstError.path.includes('dueDate') && firstError.type === 'date.greater') {
      message = 'Due date must be in the future';
    } else if (firstError.type === 'any.required') {
      message = 'Missing required fields';
    }

    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message,
        details: firstError.message,
      }
    });
  }

  next();
};

exports.validateUpdateTask = (req, res, next) => {
  const { error } = updateTaskSchema.validate(req.body, { abortEarly: false });

  if (error) {
    const firstError = error.details[0];
    let message = 'Validation failed';
    
    if (firstError.path.includes('tags') && firstError.type === 'array.min') {
      message = 'At least one tag is required';
    } else if (firstError.path.includes('dueDate') && firstError.type === 'date.greater') {
      message = 'Due date must be in the future';
    }

    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message,
        details: firstError.message,
      }
    });
  }

  next();
};

exports.validateStatusTransition = (req, res, next) => {
  if (!req.task) {
    return res.status(404).json({
      error: {
        code: 'TASK_NOT_FOUND',
        message: 'Task not found'
      }
    });
  }

  const { status: currentStatus, priority } = req.task;
  const { status: newStatus } = req.body;

  if (!newStatus) {
    return next();
  }

  // Check for high priority archive restriction
  if (newStatus === TaskStatus.ARCHIVED && priority === TaskPriority.HIGH && currentStatus !== TaskStatus.COMPLETED) {
    return res.status(400).json({
      error: {
        code: 'INVALID_STATE_TRANSITION',
        message: 'High priority tasks can only be archived after completion'
      }
    });
  }

  const validTransitions = VALID_STATUS_TRANSITIONS[currentStatus];
  if (!validTransitions.includes(newStatus)) {
    return res.status(400).json({
      error: {
        code: 'INVALID_STATE_TRANSITION',
        message: `Invalid transition ${currentStatus} -> ${newStatus}`,
      }
    });
  }

  next();
};

// Validation for query parameters
exports.validateQueryParams = (req, res, next) => {
  const querySchema = Joi.object({
    status: Joi.string().valid(...Object.values(TaskStatus)),
    priority: Joi.string().valid(...Object.values(TaskPriority)),
    dueDateStart: Joi.date(),
    dueDateEnd: Joi.date().greater(Joi.ref('dueDateStart')),
    tags: Joi.array().items(Joi.string()),
    sortBy: Joi.string().valid('dueDate', 'priority', 'createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc'),
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
  });

  const { error } = querySchema.validate(req.query, { abortEarly: false });

  if (error) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid query parameters',
        details: error.details.map((detail) => detail.message).join(', '),
      }
    });
  }

  next();
};

// Middleware to load task into request for validation
const taskService = new TaskService();

exports.loadTask = (req, res, next) => {
  try {
    const { id } = req.params;
    const task = taskService.getTask(id);
    req.task = task;
    next();
  } catch (error) {
    next(error);
  }
};
