import { sequelize } from '../config/database.js';
import { User, Course, CourseEnrollment, Assignment, AssignmentSubmission, Quiz, QuizAttempt, Attendance } from '../models/index.js';
import { Op } from 'sequelize';
import { getOrSet } from '../utils/redisCache.js';

export const getDashboardStats = async (req, res, next) => {
  try {
    const cachedData = await getOrSet('analytics:dashboard', 60, async () => {
      const [totalUsers, totalCourses, totalAssignments, totalQuizzes, recentAttendance] = await Promise.all([
        User.count({ where: { isActive: true } }),
        Course.count({ where: { isArchived: false } }),
        Assignment.count(),
        Quiz.count({ where: { isPublished: true } }),
        Attendance.count({ where: { createdAt: { [Op.gte]: new Date(Date.now() - 7 * 24 * 3600000) } } })
      ]);

      const [studentCount, teacherCount, adminCount] = await Promise.all([
        User.count({ where: { role: 'student', isActive: true } }),
        User.count({ where: { role: 'teacher', isActive: true } }),
        User.count({ where: { role: 'admin', isActive: true } })
      ]);

      const [gradedCount, pendingCount] = await Promise.all([
        AssignmentSubmission.count({ where: { status: 'graded' } }),
        AssignmentSubmission.count({ where: { status: 'pending' } })
      ]);

      const [passCount, failCount] = await Promise.all([
        QuizAttempt.count({ where: { status: 'submitted', passed: true } }),
        QuizAttempt.count({ where: { status: 'submitted', passed: false } })
      ]);

      // Daily attendance for the last 7 days
      const days = 7;
      const attendanceTrend = [];
      for (let i = days - 1; i >= 0; i--) {
        const dayStart = new Date(); dayStart.setDate(dayStart.getDate() - i); dayStart.setHours(0,0,0,0);
        const dayEnd = new Date(); dayEnd.setDate(dayEnd.getDate() - i); dayEnd.setHours(23,59,59,999);
        const count = await Attendance.count({ where: { createdAt: { [Op.between]: [dayStart, dayEnd] } } });
        attendanceTrend.push({ date: dayStart.toLocaleDateString('en-US', { weekday: 'short' }), count });
      }

      return {
        stats: { totalUsers, totalCourses, totalAssignments, totalQuizzes, recentAttendance },
        userBreakdown: { students: studentCount, teachers: teacherCount, admins: adminCount },
        submissions: { graded: gradedCount, pending: pendingCount },
        quizStats: { passed: passCount, failed: failCount },
        attendanceTrend
      };
    });

    res.json({
      success: true,
      ...cachedData
    });
  } catch (err) { next(err); }
};

export const getTeacherStats = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const [courses, assignments, quizzes] = await Promise.all([
      Course.findAll({ where: { teacherId, isArchived: false }, attributes: ['id', 'title'] }),
      Assignment.count({ where: { teacherId } }),
      Quiz.count({ where: { teacherId } })
    ]);

    // Enrollment counts per course
    const coursesWithCounts = await Promise.all(courses.map(async (c) => {
      const [enrolled, submissions] = await Promise.all([
        CourseEnrollment.count({ where: { courseId: c.id } }),
        AssignmentSubmission.count({
          where: {},
          include: [{ model: Assignment, as: 'assignment', where: { courseId: c.id }, required: true }]
        }).catch(() => 0)
      ]);
      return { ...c.toJSON(), enrolled, submissions };
    }));

    res.json({ success: true, courses: coursesWithCounts, totalAssignments: assignments, totalQuizzes: quizzes });
  } catch (err) { next(err); }
};

export const getStudentStats = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const [enrollments, submissions, attempts, attendance] = await Promise.all([
      CourseEnrollment.count({ where: { studentId } }),
      AssignmentSubmission.count({ where: { studentId } }),
      QuizAttempt.count({ where: { studentId, status: 'submitted' } }),
      Attendance.count({ where: { userEmail: req.user.email } })
    ]);

    const [gradedSubs, passedQuizzes] = await Promise.all([
      AssignmentSubmission.findAll({ where: { studentId, status: 'graded' }, attributes: ['marks', 'assignmentId'] }),
      QuizAttempt.count({ where: { studentId, passed: true } })
    ]);

    const avgMarks = gradedSubs.length
      ? (gradedSubs.reduce((s, sub) => s + (sub.marks || 0), 0) / gradedSubs.length).toFixed(1)
      : 0;

    // Recent quiz attempts
    const recentAttempts = await QuizAttempt.findAll({
      where: { studentId, status: 'submitted' },
      include: [{ model: Quiz, as: 'quiz', attributes: ['title', 'totalMarks', 'passingMarks'] }],
      order: [['submittedAt', 'DESC']],
      limit: 5
    });

    res.json({
      success: true,
      stats: { enrollments, submissions, attempts, attendance },
      averageMarks: avgMarks,
      quizzesPassed: passedQuizzes,
      recentAttempts
    });
  } catch (err) { next(err); }
};

// Legacy system-wide Kafka event analytics (kept from Phase 2)
export const getEventStats = async (req, res, next) => {
  try {
    const stats = {
      totalMeetings: await (async () => { try { const { Meeting } = await import('../models/index.js'); return Meeting.count(); } catch { return 0; } })(),
      totalAttendance: await Attendance.count(),
      recentActivity: new Date().toISOString()
    };
    res.json({ success: true, stats });
  } catch (err) { next(err); }
};
