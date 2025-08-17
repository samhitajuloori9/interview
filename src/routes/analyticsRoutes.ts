import { Router } from 'express';
import analyticsController from '../controllers/analyticsController';

const router = Router();

/**
 * @swagger
 * /api/analytics/completion-rate:
 *   get:
 *     summary: Get task completion rates over time
 *     tags: [Analytics]
 *     parameters:
 *       - in: query
 *         name: interval
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly]
 *           default: daily
 *         description: The time interval to group results by
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering (inclusive, YYYY-MM-DD)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering (inclusive, YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Successfully retrieved completion rates
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                       completed:
 *                         type: number
 *                       total:
 *                         type: number
 *                       completionRate:
 *                         type: number
 *                 interval:
 *                   type: string
 *                 from:
 *                   type: string
 *                 to:
 *                   type: string
 *       400:
 *         description: Invalid date format or parameters
 *       500:
 *         description: Internal server error
 */
router.get('/completion-rate', analyticsController.getCompletionRates);

/**
 * @swagger
 * /api/analytics/avg-completion-time:
 *   get:
 *     summary: Get average task completion time
 *     tags: [Analytics]
 *     parameters:
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [priority, overall]
 *           default: overall
 *         description: Group results by priority or show overall average
 *     responses:
 *       200:
 *         description: Successfully retrieved average completion times
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       group:
 *                         type: string
 *                       avgCompletionTimeHours:
 *                         type: number
 *                       count:
 *                         type: number
 *                 groupBy:
 *                   type: string
 *       500:
 *         description: Internal server error
 */
router.get('/avg-completion-time', analyticsController.getAverageCompletionTime);

/**
 * @swagger
 * /api/analytics/top-tags:
 *   get:
 *     summary: Get most used tags with completion rates
 *     tags: [Analytics]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Maximum number of tags to return (1-100)
 *     responses:
 *       200:
 *         description: Successfully retrieved top tags
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       tag:
 *                         type: string
 *                       count:
 *                         type: number
 *                       completionRate:
 *                         type: number
 *                 limit:
 *                   type: number
 *                 totalTags:
 *                   type: number
 *       400:
 *         description: Invalid limit parameter
 *       500:
 *         description: Internal server error
 */
router.get('/top-tags', analyticsController.getTopTags);

export default router;
