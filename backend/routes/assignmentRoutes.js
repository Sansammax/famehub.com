import express from 'express';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';
import {
  listAssignments, getAssignment, createAssignment,
  updateAssignment, deleteAssignment, submitAssignment,
  listSubmissions, gradeSubmission
} from '../controllers/assignmentController.js';
import { uploadAssignment } from '../utils/fileStorage.js';

const router = express.Router();
router.use(verifyToken);

const handleUpload = (req, res, next) => {
  uploadAssignment(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    next();
  });
};

/**
 * @swagger
 * /api/assignments:
 *   get:
 *     summary: List assignments (filtered by role)
 *     tags: [Assignments]
 */
router.get('/', listAssignments);
router.get('/:id', getAssignment);
router.post('/', requireRole('admin', 'teacher'), handleUpload, createAssignment);
router.put('/:id', requireRole('admin', 'teacher'), updateAssignment);
router.delete('/:id', requireRole('admin', 'teacher'), deleteAssignment);
router.post('/:id/submit', requireRole('student'), handleUpload, submitAssignment);
router.get('/:id/submissions', requireRole('admin', 'teacher'), listSubmissions);
router.put('/submissions/:submissionId/grade', requireRole('admin', 'teacher'), gradeSubmission);

export default router;
