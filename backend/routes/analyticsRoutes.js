import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getDashboardStats, getTeacherStats, getStudentStats, getEventStats } from '../controllers/analyticsController.js';

const router = express.Router();

/**
 * @swagger
 * /api/analytics/dashboard:
 *   get:
 *     summary: Admin dashboard statistics (real DB counts)
 *     tags: [Analytics]
 */
router.get('/dashboard', protect, getDashboardStats);
router.get('/teacher', protect, getTeacherStats);
router.get('/student', protect, getStudentStats);
router.get('/events', protect, getEventStats);

export default router;
