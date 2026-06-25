import express from 'express';
import {
  createMeeting,
  joinMeeting,
  endMeeting,
  getMeetingInfo,
  getRecordings,
  getActiveMeetings,
  handleSimulatorAction,
  renderMockClassroom,
  getAttendance
} from '../controllers/liveController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Simulated classroom and events
router.get('/mock-classroom', renderMockClassroom);
router.post('/simulate-action', handleSimulatorAction);

// BigBlueButton CRUD APIs
router.post('/create', protect, authorize('teacher', 'admin'), createMeeting);
router.post('/join', protect, joinMeeting);
router.post('/end', protect, authorize('teacher', 'admin'), endMeeting);
router.get('/info/:meetingId', protect, getMeetingInfo);
router.get('/recordings', protect, getRecordings);
router.get('/active', protect, getActiveMeetings);
router.get('/meetings', protect, getActiveMeetings);
router.get('/attendance', protect, authorize('teacher', 'admin'), getAttendance);

export default router;
