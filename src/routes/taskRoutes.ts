import { Router } from 'express';
import { TaskController } from '../controllers/taskController';
import { BatchController } from '../controllers/batchController';
import { loadTaskById } from '../middleware/loadTask';
const { validateTask, validateUpdateTask, validateStatusTransition } = require('../middleware/validation');

const router = Router();
const taskController = new TaskController();
const batchController = new BatchController();

// Load task by ID for routes that need it
router.param('id', loadTaskById('id'));

/**
 * @swagger
 * /api/tasks/batch:
 *   post:
 *     summary: Execute batch operations
 *     tags: [Batch]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [operations]
 *             properties:
 *               operations:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [op]
 *                   properties:
 *                     op:
 *                       type: string
 *                       enum: [create, update, delete]
 *                     id:
 *                       type: string
 *                     data:
 *                       type: object
 *                     force:
 *                       type: boolean
 *     responses:
 *       200:
 *         description: Batch operations completed successfully
 *       400:
 *         description: Batch operations failed and rolled back
 */
router.post('/batch', batchController.processBatch);


/**
 * @swagger
 * /api/tasks:
 *   post:
 *     summary: Create a new task
 *     tags: [Tasks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTaskRequest'
 *     responses:
 *       201:
 *         description: Task created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', validateTask, taskController.createTask);

/**
 * @swagger
 * /api/batch:
 *   post:
 *     summary: Execute batch operations
 *     tags: [Batch]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               operations:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     op:
 *                       type: string
 *                       enum: [create, update, delete]
 *                     id:
 *                       type: string
 *                     data:
 *                       type: object
 *                     force:
 *                       type: boolean
 *     responses:
 *       200:
 *         description: Batch operations completed successfully
 *       400:
 *         description: Batch operations failed and rolled back
 */
router.post('/api/tasks/batch', batchController.processBatch);

/**
 * @swagger
 * /api/tasks:
 *   get:
 *     summary: Get all tasks
 *     tags: [Tasks]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, in-progress, completed, archived]
 *         description: Filter tasks by status
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high]
 *         description: Filter tasks by priority
 *     responses:
 *       200:
 *         description: List of tasks
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Task'
 */
router.get('/', taskController.getAllTasks);

/**
 * @swagger
 * /api/tasks/{id}:
 *   get:
 *     summary: Get a task by ID
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *     responses:
 *       200:
 *         description: Task found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       404:
 *         description: Task not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', taskController.getTask);

/**
 * @swagger
 * /api/tasks/{id}:
 *   put:
 *     summary: Update a task
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateTaskRequest'
 *     responses:
 *       200:
 *         description: Task updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       404:
 *         description: Task not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/:id', validateUpdateTask, validateStatusTransition, taskController.updateTask);

/**
 * @swagger
 * /api/tasks/{id}/status:
 *   patch:
 *     summary: Update task status
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, in-progress, completed, archived]
 *             required:
 *               - status
 *     responses:
 *       200:
 *         description: Task status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       400:
 *         description: Invalid state transition
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch('/:id/status', validateStatusTransition, taskController.updateTaskStatus);

/**
 * @swagger
 * /api/tasks/{id}:
 *   delete:
 *     summary: Delete a task
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *       - in: query
 *         name: force
 *         schema:
 *           type: boolean
 *         description: Force delete even if task has dependents
 *     responses:
 *       204:
 *         description: Task deleted successfully
 *       400:
 *         description: Task has dependents and force not specified
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Task not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:id', taskController.deleteTask);

// Dependency management routes
/**
 * @swagger
 * /api/tasks/{id}/dependencies:
 *   put:
 *     summary: Replace task dependencies
 *     tags: [Task Dependencies]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               dependencies:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of task IDs this task depends on
 *             required:
 *               - dependencies
 *     responses:
 *       200:
 *         description: Dependencies updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       400:
 *         description: Validation error (cycle detected, self-dependency, etc.)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               cycle:
 *                 summary: Dependency cycle detected
 *                 value:
 *                   error: "Adding dependency would create a cycle"
 *                   code: "DEPENDENCY_CYCLE"
 *               self:
 *                 summary: Self-dependency rejected
 *                 value:
 *                   error: "Task cannot depend on itself"
 *                   code: "SELF_DEPENDENCY"
 *       404:
 *         description: Task not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/:id/dependencies', taskController.setTaskDependencies);

/**
 * @swagger
 * /api/tasks/{id}/dependencies:
 *   post:
 *     summary: Add dependencies to task
 *     tags: [Task Dependencies]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               dependencies:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of task IDs to add as dependencies
 *             required:
 *               - dependencies
 *     responses:
 *       200:
 *         description: Dependencies added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       400:
 *         description: Validation error (cycle detected, self-dependency, etc.)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               blocked:
 *                 summary: Completion blocked by dependencies
 *                 value:
 *                   error: "Cannot complete task while dependencies are incomplete"
 *                   code: "BLOCKED_BY_DEPENDENCIES"
 *       404:
 *         description: Task not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/:id/dependencies', taskController.addTaskDependencies);

/**
 * @swagger
 * /api/tasks/{id}/dependencies/{depId}:
 *   delete:
 *     summary: Remove a dependency from task
 *     tags: [Task Dependencies]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *       - in: path
 *         name: depId
 *         required: true
 *         schema:
 *           type: string
 *         description: Dependency task ID to remove
 *     responses:
 *       200:
 *         description: Dependency removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       404:
 *         description: Task not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:id/dependencies/:depId', taskController.removeTaskDependency);

export default router;
