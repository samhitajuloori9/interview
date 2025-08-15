const { isAfter } = require('date-fns');

// Task statuses and priorities as enums
const TaskStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
};

const TaskPriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
};

// Valid status transitions
const VALID_STATUS_TRANSITIONS = {
  [TaskStatus.PENDING]: [TaskStatus.IN_PROGRESS],
  [TaskStatus.IN_PROGRESS]: [TaskStatus.COMPLETED],
  [TaskStatus.COMPLETED]: [TaskStatus.ARCHIVED],
  [TaskStatus.ARCHIVED]: [],
};

class Task {
  constructor({
    id,
    title,
    description,
    dueDate,
    status = TaskStatus.PENDING,
    priority = TaskPriority.MEDIUM,
    tags = [],
    dependencies = [],
  }) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.dueDate = new Date(dueDate);
    this.status = status;
    this.priority = priority;
    this.tags = tags;
    this.dependencies = dependencies;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  update(updates) {
    Object.assign(this, updates);
    this.updatedAt = new Date();
  }

  canTransitionTo(newStatus) {
    const validTransitions = VALID_STATUS_TRANSITIONS[this.status];
    return validTransitions.includes(newStatus);
  }

  canBeArchived() {
    if (this.priority === TaskPriority.HIGH) {
      return this.status === TaskStatus.COMPLETED;
    }
    return true;
  }

  validate() {
    // Check due date is not in the past
    if (!isAfter(this.dueDate, new Date())) {
      throw new Error('Due date cannot be in the past');
    }

    // Check tags
    if (!Array.isArray(this.tags) || this.tags.length === 0) {
      throw new Error('Task must have at least one tag');
    }

    // Validate status transition
    if (this.status === TaskStatus.ARCHIVED && !this.canBeArchived()) {
      throw new Error('High priority tasks must be completed before archiving');
    }
  }
}

module.exports = {
  Task,
  TaskStatus,
  TaskPriority,
  VALID_STATUS_TRANSITIONS,
};
