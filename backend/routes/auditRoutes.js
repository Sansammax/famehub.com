import express from 'express';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';
import { listAuditLogs } from '../controllers/auditController.js';

const router = express.Router();
router.use(verifyToken, requireRole('admin'));

/**
 * @swagger
 * /api/audit-logs:
 *   get:
 *     summary: List audit logs (admin only)
 *     tags: [Audit]
 */
router.get('/', listAuditLogs);

export default router;
