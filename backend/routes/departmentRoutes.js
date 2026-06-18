import express from 'express';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';
import { listDepartments, createDepartment, updateDepartment, deleteDepartment } from '../controllers/departmentController.js';

const router = express.Router();
router.use(verifyToken);

/**
 * @swagger
 * /api/departments:
 *   get:
 *     summary: List all departments
 *     tags: [Departments]
 */
router.get('/', listDepartments);
router.post('/', requireRole('admin'), createDepartment);
router.put('/:id', requireRole('admin'), updateDepartment);
router.delete('/:id', requireRole('admin'), deleteDepartment);

export default router;
