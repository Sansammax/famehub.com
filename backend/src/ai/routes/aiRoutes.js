import express from 'express';
import { protect, authorize } from '../../../middleware/authMiddleware.js';
import {
  chatController,
  generateQuizController,
  evaluateAssignmentController,
  summarizeRecordingController,
  getRecommendationsController,
  searchController,
  getHistoryController,
  getMetricsController
} from '../controllers/aiController.js';
import { apiLimiter } from '../../../middleware/rateLimiter.js';

const router = express.Router();

router.use(protect);
router.use(apiLimiter);

router.post('/chat', chatController);
router.post('/generate-quiz', authorize('teacher', 'admin'), generateQuizController);
router.post('/evaluate-assignment', authorize('teacher', 'admin'), evaluateAssignmentController);
router.post('/summarize-recording', summarizeRecordingController);
router.post('/recommendations', getRecommendationsController);
router.post('/search', searchController);
router.get('/history', getHistoryController);
router.get('/metrics', authorize('admin'), getMetricsController);

export default router;
