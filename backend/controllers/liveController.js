import { v4 as uuidv4 } from 'uuid';
import { BigBlueButtonService } from '../services/BigBlueButtonService.js';
import { Meeting, Attendance } from '../models/index.js';
import { KafkaProducer } from '../services/KafkaProducer.js';
import { logger } from '../utils/logger.js';
import Redis from 'ioredis';

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
      moderatorPW,
      attendeePW,
      isRunning: true,
      record: !!record,
      courseId: courseId || null,
      teacherId: req.user.id || null,
      startTime: startTime ? new Date(startTime) : new Date(),
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
    const password = isModerator ? meeting.moderatorPW : meeting.attendeePW;
    const roleString = isModerator ? 'moderator' : 'student';

    // Get signed BBB link
    const joinUrl = BigBlueButtonService.getJoinUrl(meetingId, fullName, password, userEmail, roleString);

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
    const where = { isRunning: true };
    if (req.user.role === 'student') {
      const enrollments = await CourseEnrollment.findAll({ where: { studentId: req.user.id } });
      const enrolledCourseIds = enrollments.map(e => e.courseId);
      where.courseId = enrolledCourseIds;
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

// Simulator Action Handler (Emulates browser events triggers for testing)
export const handleSimulatorAction = async (req, res, next) => {
  try {
    const { meetingId, action, email, name, role } = req.body;
    
    if (action === 'join') {
      await KafkaProducer.publishEvent('live-class-events', 'Student Joined Class', {
        email,
        name,
        meetingId,
        role: role || 'student'
      });
    } else if (action === 'leave') {
      await KafkaProducer.publishEvent('live-class-events', 'Student Left Class', {
        email,
        meetingId
      });
    }

    res.status(200).json({ success: true, message: `Simulated action "${action}" completed.` });
  } catch (error) {
    next(error);
  }
};

// Renders the simulated BBB HTML dashboard window
export const renderMockClassroom = (req, res) => {
  const { meetingId, fullName, role, userId } = req.query;

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>BigBlueButton Live Classroom Simulator</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
      <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
      <style>
        body {
          background-color: #0c0f1d;
          color: #f1f3f9;
          font-family: system-ui, -apple-system, sans-serif;
          height: 100vh;
          overflow: hidden;
        }
        .bbb-navbar {
          background-color: #161b33;
          border-bottom: 1px solid #282f54;
          padding: 10px 20px;
        }
        .main-layout {
          display: flex;
          height: calc(100vh - 57px);
        }
        .left-sidebar {
          width: 250px;
          background-color: #121629;
          border-right: 1px solid #282f54;
          padding: 20px;
          display: flex;
          flex-column: column;
        }
        .video-canvas {
          flex-grow: 1;
          background-color: #080a14;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        .video-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 15px;
          width: 90%;
          max-width: 1000px;
        }
        .user-video-card {
          background-color: #161b33;
          border: 2px solid #2d3566;
          border-radius: 12px;
          aspect-ratio: 16/9;
          overflow: hidden;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .user-video-card.active-speaker {
          border-color: #4f46e5;
          box-shadow: 0 0 15px rgba(79, 70, 229, 0.4);
        }
        .user-video-card img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .user-label {
          position: absolute;
          bottom: 8px;
          left: 8px;
          background-color: rgba(0, 0, 0, 0.6);
          color: white;
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 0.75rem;
        }
        .control-dock {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          background-color: rgba(22, 27, 51, 0.9);
          border: 1px solid #282f54;
          border-radius: 30px;
          padding: 10px 24px;
          display: flex;
          gap: 15px;
        }
        .dock-btn {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: none;
          background-color: #242b4d;
          color: #f1f3f9;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .dock-btn:hover {
          background-color: #4f46e5;
        }
        .dock-btn.active {
          background-color: #ef4444;
        }
        .dock-btn.active:hover {
          background-color: #dc2626;
        }
        .sim-panel {
          background: rgba(79, 70, 229, 0.08);
          border: 1px solid rgba(79, 70, 229, 0.2);
          border-radius: 10px;
          padding: 15px;
          margin-top: auto;
        }
      </style>
    </head>
    <body>
      <nav class="bbb-navbar d-flex justify-content-between align-items-center">
        <div class="d-flex align-items-center gap-2">
          <i class="bi bi-mortarboard-fill text-primary fs-3"></i>
          <span class="fw-bold fs-5">FameHub Class Live Simulator</span>
        </div>
        <div class="d-flex align-items-center gap-3">
          <span class="badge bg-danger px-3 py-2"><i class="bi bi-broadcast me-2"></i>BBB SESSION LIVE</span>
          <span class="text-muted text-capitalize">Role: <strong>${role}</strong></span>
        </div>
      </nav>

      <div class="main-layout">
        <div class="left-sidebar d-flex flex-column">
          <h6 class="text-muted text-uppercase mb-3">Participants</h6>
          <div class="flex-grow-1 overflow-auto" id="userList">
            <div class="d-flex align-items-center gap-2 mb-2">
              <i class="bi bi-person-fill-check text-success"></i>
              <span class="text-capitalize">${fullName} (You)</span>
            </div>
            <div id="simulatedStudents">
              <!-- Dynamically populated simulated student logins -->
            </div>
          </div>

          <div class="sim-panel">
            <h6 class="text-indigo mb-2"><i class="bi bi-cpu-fill"></i> Event Simulator</h6>
            <p class="small text-muted mb-3">Use these controls to fire event triggers back to Kafka and update the main dashboards.</p>
            <div class="d-grid gap-2">
              <button class="btn btn-outline-primary btn-sm" id="simJoinBtn"><i class="bi bi-person-plus-fill"></i> Sim Student Join</button>
              <button class="btn btn-outline-warning btn-sm" id="simLeaveBtn" disabled><i class="bi bi-person-dash-fill"></i> Sim Student Leave</button>
            </div>
          </div>
        </div>

        <div class="video-canvas">
          <div class="video-grid" id="videoGrid">
            <div class="user-video-card active-speaker" id="myVideo">
              <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=4f46e5&color=fff&size=200" alt="Me">
              <span class="user-label text-capitalize">${fullName}</span>
            </div>
          </div>

          <div class="control-dock">
            <button class="dock-btn" onclick="this.classList.toggle('active'); this.innerHTML = this.classList.contains('active') ? '<i class=\\'bi bi-mic-mute-fill\\'></i>' : '<i class=\\'bi bi-mic-fill\\'></i>'"><i class="bi bi-mic-fill"></i></button>
            <button class="dock-btn" onclick="this.classList.toggle('active'); this.innerHTML = this.classList.contains('active') ? '<i class=\\'bi bi-camera-video-off-fill\\'></i>' : '<i class=\\'bi bi-camera-video-fill\\'></i>'"><i class="bi bi-camera-video-fill"></i></button>
            <button class="dock-btn"><i class="bi bi-display"></i></button>
            <button class="dock-btn active" id="leaveSessionBtn" title="Leave Class"><i class="bi bi-telephone-x-fill"></i></button>
          </div>
        </div>
      </div>

      <script>
        const meetingId = '${meetingId}';
        const myEmail = '${userId}';
        const myName = '${fullName}';
        const myRole = '${role}';

        const simulatedPool = [
          { email: 'amy.smith@famehub.edu', name: 'Amy Smith' },
          { email: 'bob.johnson@famehub.edu', name: 'Bob Johnson' },
          { email: 'charlie.brown@famehub.edu', name: 'Charlie Brown' },
          { email: 'diana.prince@famehub.edu', name: 'Diana Prince' }
        ];

        const activeStudents = [];

        // Join Simulated Student
        document.getElementById('simJoinBtn').addEventListener('click', async () => {
          if (activeStudents.length >= simulatedPool.length) return;
          const nextStudent = simulatedPool[activeStudents.length];
          activeStudents.push(nextStudent);

          // Update UI
          updateStudentUI();

          // Post to server simulator endpoint
          await fetch('/api/live/simulate-action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              meetingId,
              action: 'join',
              email: nextStudent.email,
              name: nextStudent.name,
              role: 'student'
            })
          });

          document.getElementById('simLeaveBtn').disabled = false;
          if (activeStudents.length === simulatedPool.length) {
            document.getElementById('simJoinBtn').disabled = true;
          }
        });

        // Leave Simulated Student
        document.getElementById('simLeaveBtn').addEventListener('click', async () => {
          if (activeStudents.length === 0) return;
          const leavingStudent = activeStudents.pop();

          // Update UI
          updateStudentUI();

          // Post to server simulator endpoint
          await fetch('/api/live/simulate-action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              meetingId,
              action: 'leave',
              email: leavingStudent.email
            })
          });

          document.getElementById('simJoinBtn').disabled = false;
          if (activeStudents.length === 0) {
            document.getElementById('simLeaveBtn').disabled = true;
          }
        });

        function updateStudentUI() {
          const listDiv = document.getElementById('simulatedStudents');
          const gridDiv = document.getElementById('videoGrid');
          
          listDiv.innerHTML = '';
          
          // Clear current extra videos
          const extraCards = document.querySelectorAll('.user-video-card:not(#myVideo)');
          extraCards.forEach(c => c.remove());

          activeStudents.forEach((student, index) => {
            // Add list element
            const item = document.createElement('div');
            item.className = 'd-flex align-items-center gap-2 mb-2 text-muted';
            item.innerHTML = \`<i class="bi bi-person-fill text-primary"></i><span>\${student.name}</span>\`;
            listDiv.appendChild(item);

            // Add video panel
            const card = document.createElement('div');
            card.className = 'user-video-card';
            card.innerHTML = \`
              <img src="https://ui-avatars.com/api/?name=\${encodeURIComponent(student.name)}&background=10b981&color=fff&size=200" alt="\${student.name}">
              <span class="user-label">\${student.name}</span>
            \`;
            gridDiv.appendChild(card);
          });
        }

        // Leave Classroom
        document.getElementById('leaveSessionBtn').addEventListener('click', async () => {
          // Send leave trigger for active simulated students
          for (const student of activeStudents) {
            await fetch('/api/live/simulate-action', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                meetingId,
                action: 'leave',
                email: student.email
              })
            });
          }

          // Leave event for active user if not moderator
          if (myRole !== 'moderator') {
            await fetch('/api/live/simulate-action', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                meetingId,
                action: 'leave',
                email: myEmail
              })
            });
          }

          // Close window or go back
          window.location.href = 'http://localhost:5173/';
        });
      </script>
    </body>
    </html>
  `);
};

export const getAttendance = async (req, res, next) => {
  try {
    const attendance = await Attendance.findAll({
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, attendance });
  } catch (err) { next(err); }
};
