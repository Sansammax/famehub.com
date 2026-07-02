import { v4 as uuidv4 } from 'uuid';
import { BigBlueButtonService } from '../services/BigBlueButtonService.js';
import { Meeting, Attendance, CourseEnrollment, Course } from '../models/index.js';
import { KafkaProducer } from '../services/KafkaProducer.js';
import { logger } from '../utils/logger.js';
import Redis from 'ioredis';
import { Op } from 'sequelize';

// Initialize Redis Cache
let redis = null;
let useRedisMock = false;
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

try {
  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    connectTimeout: 2000
  });
  redis.on('error', (err) => {
    logger.warn('[Redis] Connection error, falling back to local memory cache:', err.message);
    useRedisMock = true;
  });
} catch (error) {
  logger.warn('[Redis] Initialization error, using mock memory cache:', error.message);
  useRedisMock = true;
}

const memoryCache = new Map();

const cacheSet = async (key, val, ttlSeconds) => {
  if (useRedisMock || !redis) {
    memoryCache.set(key, { value: val, expiry: Date.now() + ttlSeconds * 1000 });
  } else {
    try {
      await redis.set(key, JSON.stringify(val), 'EX', ttlSeconds);
    } catch (e) {
      useRedisMock = true;
      memoryCache.set(key, { value: val, expiry: Date.now() + ttlSeconds * 1000 });
    }
  }
};

const cacheGet = async (key) => {
  if (useRedisMock || !redis) {
    const data = memoryCache.get(key);
    if (!data) return null;
    if (data.expiry < Date.now()) {
      memoryCache.delete(key);
      return null;
    }
    return data.value;
  } else {
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      useRedisMock = true;
      const data = memoryCache.get(key);
      if (!data) return null;
      if (data.expiry < Date.now()) {
        memoryCache.delete(key);
        return null;
      }
      return data.value;
    }
  }
};

export const createMeeting = async (req, res, next) => {
  try {
    const { name, record, courseId, startTime, duration } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Please specify a meeting name.' });
    }

    if (!courseId) {
      return res.status(400).json({ success: false, message: 'Course is mandatory.' });
    }

    const course = await Course.findByPk(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    const courseName = course.title || course.name;
    const teacherName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email;

    const meetingId = `meet-${uuidv4().substring(0, 8)}`;
    const moderatorPW = 'mod123';
    const attendeePW = 'att123';

    // 1. Create meeting in BBB service
    await BigBlueButtonService.createMeeting(meetingId, name, {
      moderatorPW,
      attendeePW,
      record: !!record
    });

    // 2. Store meeting in local Database
    const meeting = await Meeting.create({
      meetingId,
      name,
      meetingName: name,
      moderatorPW,
      attendeePW,
      isRunning: true,
      isActive: true,
      record: !!record,
      courseId,
      courseName,
      teacherId: req.user.id || null,
      teacherName,
      joinUrl: meetingId,
      startTime: startTime ? new Date(startTime) : new Date(),
      startedAt: startTime ? new Date(startTime) : new Date(),
      duration: duration ? parseInt(duration, 10) : 60
    });

    logger.audit('Meeting Created', req.user.email, { meetingId, name });

    // 3. Publish to Kafka
    await KafkaProducer.publishEvent('live-class-events', 'Teacher Started Class', {
      meetingId,
      name,
      teacherEmail: req.user.email
    });

    res.status(201).json({
      success: true,
      meeting: {
        meetingId: meeting.meetingId,
        name: meeting.name,
        moderatorPW: meeting.moderatorPW,
        attendeePW: meeting.attendeePW,
        record: meeting.record
      }
    });
  } catch (error) {
    next(error);
  }
};

export const joinMeeting = async (req, res, next) => {
  try {
    const { meetingId, fullName } = req.body;
    const userEmail = req.user.email;
    const userRole = req.user.role;

    if (!meetingId || !fullName) {
      return res.status(400).json({ success: false, message: 'Meeting ID and user Name are required.' });
    }

    const meeting = await Meeting.findOne({ where: { meetingId } });
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting session not found.' });
    }

    const isModerator = userRole === 'teacher' || userRole === 'admin';

    // Enrollment and active meeting validation for students
    if (!isModerator) {
      if (!meeting.isActive || meeting.endedAt !== null) {
        return res.status(403).json({ success: false, message: 'This meeting is not active.' });
      }

      if (meeting.courseId) {
        const enrollment = await CourseEnrollment.findOne({
          where: {
            studentId: req.user.id,
            courseId: meeting.courseId
          }
        });
        if (!enrollment) {
          return res.status(403).json({ success: false, message: 'You are not enrolled in this course.' });
        }
      }
    }

    const password = isModerator ? meeting.moderatorPW : meeting.attendeePW;
    const roleString = isModerator ? 'moderator' : 'student';

    // Get signed BBB link
    const joinUrl = BigBlueButtonService.joinMeeting(meetingId, fullName, password, userEmail, roleString);

    logger.audit('Meeting Join Request', userEmail, { meetingId, roleString });

    // Publish to Kafka: Student Join event
    if (!isModerator) {
      await KafkaProducer.publishEvent('live-class-events', 'Student Joined Class', {
        email: userEmail,
        name: fullName,
        meetingId,
        role: 'student'
      });
    } else {
      meeting.isRunning = true;
      meeting.isActive = true;
      await meeting.save();
    }

    res.status(200).json({
      success: true,
      joinUrl
    });
  } catch (error) {
    next(error);
  }
};

export const endMeeting = async (req, res, next) => {
  try {
    const { meetingId } = req.body;

    if (!meetingId) {
      return res.status(400).json({ success: false, message: 'Meeting ID is required.' });
    }

    const meeting = await Meeting.findOne({ where: { meetingId } });
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found.' });
    }

    // Terminate BBB session
    await BigBlueButtonService.endMeeting(meetingId, meeting.moderatorPW);

    // Save end state
    meeting.isRunning = false;
    meeting.isActive = false;
    meeting.endedAt = new Date();
    await meeting.save();

    // End active attendance trackers
    const activeParticipants = await Attendance.findAll({
      where: { meetingId, leaveTime: null }
    });

    const THRESHOLD = parseInt(process.env.ATTENDANCE_THRESHOLD_SECONDS || '60', 10);
    const leaveTime = new Date();

    for (const record of activeParticipants) {
      const sessionDuration = Math.round((leaveTime.getTime() - record.joinTime.getTime()) / 1000);
      record.leaveTime = leaveTime;
      record.durationSeconds = (record.durationSeconds || 0) + sessionDuration;

      if (record.durationSeconds >= THRESHOLD) {
        record.status = 'Present';
      } else if (record.durationSeconds > 10) {
        record.status = 'Partial';
      } else {
        record.status = 'Absent';
      }
      await record.save();

      // Publish attendance mark event
      await KafkaProducer.publishEvent('attendance-events', 'Attendance Marked', {
        userEmail: record.userEmail,
        userName: record.userName,
        meetingId: record.meetingId,
        durationSeconds: record.durationSeconds,
        status: record.status
      });
    }

    logger.audit('Meeting Force Ended', req.user.email, { meetingId });

    // Publish meeting ended event
    await KafkaProducer.publishEvent('live-class-events', 'Meeting Ended', { meetingId });

    // Simulate recording assembly delay
    if (meeting.record) {
      setTimeout(async () => {
        await KafkaProducer.publishEvent('recording-events', 'Recording Published', {
          meetingId,
          name: meeting.name
        });
      }, 5000);
    }

    res.status(200).json({
      success: true,
      message: 'Meeting terminated successfully.'
    });
  } catch (error) {
    next(error);
  }
};

export const getMeetingInfo = async (req, res, next) => {
  try {
    const { meetingId } = req.params;

    // Cache lookup
    const cacheKey = `bbb:meeting:info:${meetingId}`;
    const cachedInfo = await cacheGet(cacheKey);

    if (cachedInfo) {
      return res.status(200).json({
        success: true,
        source: 'cache',
        info: cachedInfo
      });
    }

    const meeting = await Meeting.findOne({ where: { meetingId } });
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found.' });
    }

    // Retrieve from BBB service
    const bbbInfo = await BigBlueButtonService.getMeetingInfo(meetingId, meeting.moderatorPW);

    // Cache for 10 seconds
    await cacheSet(cacheKey, bbbInfo, 10);

    res.status(200).json({
      success: true,
      source: 'api',
      info: bbbInfo
    });
  } catch (error) {
    next(error);
  }
};

export const getRecordings = async (req, res, next) => {
  try {
    const recordings = await BigBlueButtonService.getRecordings();
    res.status(200).json({
      success: true,
      recordings
    });
  } catch (error) {
    next(error);
  }
};

export const getActiveMeetings = async (req, res, next) => {
  try {
    const where = {
      isActive: true,
      endedAt: null
    };

    if (req.user.role === 'student') {
      const enrollments = await CourseEnrollment.findAll({ where: { studentId: req.user.id } });
      const enrolledCourseIds = enrollments.map(e => e.courseId);
      where.courseId = enrolledCourseIds;
    } else if (req.user.role === 'teacher') {
      where.teacherId = req.user.id;
    }

    const activeMeetings = await Meeting.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      meetings: activeMeetings
    });
  } catch (error) {
    next(error);
  }
};

export const getAttendance = async (req, res, next) => {
  try {
    const attendance = await Attendance.findAll({
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, attendance });
  } catch (err) { next(err); }
};
