import dotenv from 'dotenv';
import { Attendance } from '../models/index.js';
import { KafkaProducer } from './KafkaProducer.js';

dotenv.config();

const THRESHOLD = parseInt(process.env.ATTENDANCE_THRESHOLD_SECONDS || '60', 10);

class AttendanceServiceClass {
  constructor() {
    this.intervalId = null;
  }

  // Starts the background scanner to monitor active participant duration
  startMonitoring() {
    console.log(`[AttendanceService] Starting active participants monitor. Threshold: ${THRESHOLD}s`);
    this.intervalId = setInterval(async () => {
      try {
        await this.checkActiveSessions();
      } catch (error) {
        console.error('[AttendanceService] Error checking active sessions:', error.message);
      }
    }, 10000); // scan every 10 seconds
  }

  stopMonitoring() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[AttendanceService] Stopped monitor.');
    }
  }

  async handleJoin(userEmail, userName, meetingId, role = 'student') {
    try {
      console.log(`[AttendanceService] Join event: User "${userEmail}" joined meeting "${meetingId}"`);
      
      // Look for existing record
      let record = await Attendance.findOne({
        where: { userEmail, meetingId }
      });

      if (!record) {
        // First time joining
        record = await Attendance.create({
          userEmail,
          userName,
          role,
          meetingId,
          joinTime: new Date(),
          leaveTime: null,
          durationSeconds: 0,
          status: 'Absent'
        });
        console.log(`[AttendanceService] Created initial attendance record for ${userEmail}.`);
      } else {
        // Re-joined
        record.joinTime = new Date();
        record.leaveTime = null; // reset leaveTime since they are in again
        await record.save();
        console.log(`[AttendanceService] Updated joinTime (re-join) for ${userEmail}.`);
      }
      
      // Publish student join to general subscribers if student
      if (role === 'student') {
        // Send notification event of student join
        await KafkaProducer.publishEvent('notification-events', 'Notification Broadcast', {
          userEmail: 'all',
          message: `Student ${userName} has joined the live classroom.`,
          type: 'class_join'
        });
      }
    } catch (error) {
      console.error('[AttendanceService] Error in handleJoin:', error.message);
    }
  }

  async handleLeave(userEmail, meetingId) {
    try {
      console.log(`[AttendanceService] Leave event: User "${userEmail}" left meeting "${meetingId}"`);
      
      const record = await Attendance.findOne({
        where: { userEmail, meetingId }
      });

      if (!record) {
        console.warn(`[AttendanceService] Leave event received but no record found for ${userEmail} in meeting ${meetingId}.`);
        return;
      }

      const leaveTime = new Date();
      // Calculate duration for this session
      const sessionDuration = Math.round((leaveTime.getTime() - record.joinTime.getTime()) / 1000);
      
      record.leaveTime = leaveTime;
      record.durationSeconds = (record.durationSeconds || 0) + sessionDuration;
      
      // Determine status
      if (record.durationSeconds >= THRESHOLD) {
        record.status = 'Present';
      } else if (record.durationSeconds > 10) {
        record.status = 'Partial';
      } else {
        record.status = 'Absent';
      }

      await record.save();
      console.log(`[AttendanceService] ${userEmail} left. Total Duration: ${record.durationSeconds}s. Status: ${record.status}`);

      // Publish event
      await KafkaProducer.publishEvent('attendance-events', 'Attendance Marked', {
        userEmail: record.userEmail,
        userName: record.userName,
        meetingId: record.meetingId,
        durationSeconds: record.durationSeconds,
        status: record.status
      });

      // Notification broadcast
      await KafkaProducer.publishEvent('notification-events', 'Notification Broadcast', {
        userEmail: 'all',
        message: `Student ${record.userName} left the class. Attendance marked as ${record.status}.`,
        type: 'class_leave'
      });

    } catch (error) {
      console.error('[AttendanceService] Error in handleLeave:', error.message);
    }
  }

  // Monitor active participants and promote them to Present if they pass the threshold
  async checkActiveSessions() {
    // Find all records that haven't left yet
    const activeRecords = await Attendance.findAll({
      where: { leaveTime: null }
    });

    const now = new Date();

    for (const record of activeRecords) {
      // Calculate current cumulative duration including active time
      const activeSessionDuration = Math.round((now.getTime() - record.joinTime.getTime()) / 1000);
      const totalDuration = (record.durationSeconds || 0) + activeSessionDuration;

      // If status has changed or threshold met
      if (totalDuration >= THRESHOLD && record.status !== 'Present') {
        record.status = 'Present';
        // Save database record with current updated duration
        record.durationSeconds = totalDuration;
        await record.save();
        
        console.log(`[AttendanceService] Student ${record.userEmail} crossed threshold duration of ${THRESHOLD}s while active. Status set to PRESENT.`);
        
        // Publish Event
        await KafkaProducer.publishEvent('attendance-events', 'Attendance Marked', {
          userEmail: record.userEmail,
          userName: record.userName,
          meetingId: record.meetingId,
          durationSeconds: record.durationSeconds,
          status: 'Present'
        });
      }
    }
  }
}

export const AttendanceService = new AttendanceServiceClass();
export default AttendanceService;
