import express from 'express';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';
import {
  listCourses, getCourse, createCourse, updateCourse,
  deleteCourse, enrollStudents, removeStudent, getCourseStudents
} from '../controllers/courseController.js';
import { uploadCourseCover } from '../utils/fileStorage.js';

const router = express.Router();
router.use(verifyToken);

/**
 * @swagger
 * /api/courses:
 *   get:
 *     summary: List courses (filtered by role)
 *     tags: [Courses]
 */
router.get('/', listCourses);
router.get('/:id', getCourse);
router.post('/', requireRole('admin', 'teacher'), (req, res, next) => {
  uploadCourseCover(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    next();
  });
}, createCourse);
router.put('/:id', requireRole('admin', 'teacher'), updateCourse);
router.delete('/:id', requireRole('admin'), deleteCourse);
router.post('/:id/enroll', requireRole('admin', 'teacher'), enrollStudents);
router.delete('/:id/students/:studentId', requireRole('admin', 'teacher'), removeStudent);
router.get('/:id/students', requireRole('admin', 'teacher'), getCourseStudents);

export default router;
