import express from 'express';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';
import {
  listQuizzes, getQuiz, createQuiz, updateQuiz,
  deleteQuiz, startOrSubmitAttempt, getResults, getMyAttempt
} from '../controllers/quizController.js';

const router = express.Router();
router.use(verifyToken);

/**
 * @swagger
 * /api/quizzes:
 *   get:
 *     summary: List quizzes (filtered by role)
 *     tags: [Quizzes]
 */
router.get('/', listQuizzes);
router.post('/', requireRole('admin', 'teacher'), createQuiz);
router.get('/attempts/:attemptId', getMyAttempt);
router.get('/:id', getQuiz);
router.put('/:id', requireRole('admin', 'teacher'), updateQuiz);
router.delete('/:id', requireRole('admin', 'teacher'), deleteQuiz);
router.post('/:id/attempt', requireRole('student'), startOrSubmitAttempt);
router.get('/:id/results', requireRole('admin', 'teacher'), getResults);

export default router;
