const { Task, TaskStatus } = require('../models/task');
const { differenceInDays } = require('date-fns');

// In-memory storage
const tasks = new Map();
let nextId = 1;

// Helper function for filtering tasks
const filterTasks = (tasks, filters) => {
  return Array.from(tasks.values()).filter((task) => {
    if (filters.status && task.status !== filters.status) return false;
    if (filters.priority && task.priority !== filters.priority) return false;
    if (filters.dueDateStart && task.dueDate < new Date(filters.dueDateStart)) return false;
    if (filters.dueDateEnd && task.dueDate > new Date(filters.dueDateEnd)) return false;
    if (filters.tags && !filters.tags.some((tag) => task.tags.includes(tag))) return false;
    return true;
  });
};

// Helper function for sorting tasks
const sortTasks = (tasks, sortBy = 'createdAt', sortOrder = 'desc') => {
  return tasks.sort((a, b) => {
    const multiplier = sortOrder === 'desc' ? -1 : 1;
    return multiplier * (a[sortBy] - b[sortBy]);
  });
};

// CRUD Operations
exports.createTask = async (req, res) => {
  try {
    const task = new Task({ id: nextId++, ...req.body });
    task.validate();
    tasks.set(task.id, task);
    res.status(201).json(task);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getTasks = async (req, res) => {
  try {
    let filteredTasks = filterTasks(tasks, req.query);
    filteredTasks = sortTasks(filteredTasks, req.query.sortBy, req.query.sortOrder);

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const paginatedTasks = filteredTasks.slice(startIndex, endIndex);

    res.json({
      tasks: paginatedTasks,
      pagination: {
        total: filteredTasks.length,
        page,
        pages: Math.ceil(filteredTasks.length / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTaskById = async (req, res) => {
  const task = tasks.get(parseInt(req.params.id));
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.json(task);
};

exports.updateTask = async (req, res) => {
  try {
    const task = tasks.get(parseInt(req.params.id));
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check status transition
    if (req.body.status && !task.canTransitionTo(req.body.status)) {
      return res.status(400).json({ error: 'Invalid status transition' });
    }

    task.update(req.body);
    task.validate();
    res.json(task);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteTask = async (req, res) => {
  const taskId = parseInt(req.params.id);
  if (!tasks.has(taskId)) {
    return res.status(404).json({ error: 'Task not found' });
  }

  // Check if task is a dependency for other tasks
  const dependentTasks = Array.from(tasks.values()).filter((task) =>
    task.dependencies.includes(taskId)
  );

  if (dependentTasks.length > 0) {
    return res.status(400).json({
      error: 'Task has dependencies',
      message: 'Cannot delete task that is a dependency for other tasks',
    });
  }

  tasks.delete(taskId);
  res.status(204).send();
};

// Search functionality
exports.searchTasks = async (req, res) => {
  const { query } = req.query;
  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  const searchResults = Array.from(tasks.values()).filter(
    (task) =>
      task.title.toLowerCase().includes(query.toLowerCase()) ||
      task.description.toLowerCase().includes(query.toLowerCase())
  );

  res.json(searchResults);
};

// Batch operations
exports.batchCreateTasks = async (req, res) => {
  if (!Array.isArray(req.body)) {
    return res.status(400).json({ error: 'Request body must be an array' });
  }

  try {
    const createdTasks = [];
    for (const taskData of req.body) {
      const task = new Task({ id: nextId++, ...taskData });
      task.validate();
      createdTasks.push(task);
    }

    // If all validations pass, save the tasks
    createdTasks.forEach((task) => tasks.set(task.id, task));
    res.status(201).json(createdTasks);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Analytics endpoints
exports.getCompletionRate = async (req, res) => {
  const allTasks = Array.from(tasks.values());
  const completedTasks = allTasks.filter((task) => task.status === TaskStatus.COMPLETED);

  const completionRate = (completedTasks.length / allTasks.length) * 100;

  res.json({
    total: allTasks.length,
    completed: completedTasks.length,
    completionRate: `${completionRate.toFixed(2)}%`,
  });
};

exports.getAverageCompletionTime = async (req, res) => {
  const completedTasks = Array.from(tasks.values()).filter(
    (task) => task.status === TaskStatus.COMPLETED
  );

  const completionTimes = completedTasks.map((task) => {
    const createdDate = new Date(task.createdAt);
    const completedDate = new Date(task.updatedAt);
    return differenceInDays(completedDate, createdDate);
  });

  const averageTime = completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length;

  res.json({
    averageCompletionTime: `${averageTime.toFixed(1)} days`,
    totalTasksCompleted: completedTasks.length,
  });
};

exports.getPopularTags = async (req, res) => {
  const tagCount = new Map();

  Array.from(tasks.values()).forEach((task) => {
    task.tags.forEach((tag) => {
      tagCount.set(tag, (tagCount.get(tag) || 0) + 1);
    });
  });

  const sortedTags = Array.from(tagCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag, count]) => ({ tag, count }));

  res.json(sortedTags);
};
