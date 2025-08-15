const Joi = require('joi');
const { TaskStatus, TaskPriority, VALID_STATUS_TRANSITIONS } = require('../models/task');

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

exports.validateTask = (req, res, next) => {
  const { error } = taskSchema.validate(req.body, { abortEarly: false });

  if (error) {
    return res.status(400).json({
      error: 'Validation Error',
      details: error.details.map((detail) => detail.message),
    });
  }

  next();
};

exports.validateStatusTransition = (req, res, next) => {
  const { status: currentStatus } = req.task;
  const { status: newStatus } = req.body;

  if (!newStatus) {
    return next();
  }

  const validTransitions = VALID_STATUS_TRANSITIONS[currentStatus];
  if (!validTransitions.includes(newStatus)) {
    return res.status(400).json({
      error: 'Invalid Status Transition',
      message: `Cannot transition from ${currentStatus} to ${newStatus}`,
    });
  }

  // Check if dependencies are completed when transitioning to completed
  if (newStatus === TaskStatus.COMPLETED) {
    const incompleteDependencies = req.task.dependencies.filter(
      (depId) => !tasks.get(depId) || tasks.get(depId).status !== TaskStatus.COMPLETED
    );

    if (incompleteDependencies.length > 0) {
      return res.status(400).json({
        error: 'Dependencies Not Completed',
        message: 'All dependencies must be completed before marking task as completed',
      });
    }
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
      error: 'Invalid Query Parameters',
      details: error.details.map((detail) => detail.message),
    });
  }

  next();
};
