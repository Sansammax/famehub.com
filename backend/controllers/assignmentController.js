import { Assignment, AssignmentSubmission, Course, CourseEnrollment, User } from '../models/index.js';
import { logAudit } from '../utils/auditLogger.js';
import { KafkaProducer } from '../services/KafkaProducer.js';
import { NotificationService } from '../services/NotificationService.js';

export const listAssignments = async (req, res, next) => {
  try {
    const { courseId } = req.query;
    const where = {};
    if (courseId) where.courseId = courseId;

    // Students only see assignments for their enrolled courses
    if (req.user.role === 'student') {
      const enrollments = await CourseEnrollment.findAll({ where: { studentId: req.user.id }, attributes: ['courseId'] });
      where.courseId = enrollments.map(e => e.courseId);
    } else if (req.user.role === 'teacher') {
      if (!courseId) where.teacherId = req.user.id;
    }

    const assignments = await Assignment.findAll({
      where,
      include: [{ model: Course, as: 'course', attributes: ['id', 'title'] }],
      order: [['dueDate', 'ASC']]
    });

    // For students, attach their submission status
    if (req.user.role === 'student') {
      const withStatus = await Promise.all(assignments.map(async (a) => {
        const submission = await AssignmentSubmission.findOne({ where: { assignmentId: a.id, studentId: req.user.id } });
        return { ...a.toJSON(), mySubmission: submission };
      }));
      return res.json({ success: true, assignments: withStatus });
    }

    res.json({ success: true, assignments });
  } catch (err) { next(err); }
};

export const getAssignment = async (req, res, next) => {
  try {
    const assignment = await Assignment.findByPk(req.params.id, {
      include: [{ model: Course, as: 'course' }, { model: User, as: 'teacher', attributes: ['firstName', 'lastName', 'email'] }]
    });
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found.' });
    res.json({ success: true, assignment });
  } catch (err) { next(err); }
};

export const createAssignment = async (req, res, next) => {
  try {
    const { courseId, title, description, dueDate, maxMarks, rubric, allowLateSubmission } = req.body;
    if (!courseId || !title || !dueDate) return res.status(400).json({ success: false, message: 'courseId, title, and dueDate are required.' });

    const fileUrl = req.file ? `/uploads/assignments/${req.file.filename}` : null;
    const assignment = await Assignment.create({
      courseId, teacherId: req.user.id, title, description,
      dueDate: new Date(dueDate), maxMarks: maxMarks || 100,
      rubric: rubric ? JSON.parse(rubric) : null,
      fileUrl, allowLateSubmission: allowLateSubmission === 'true'
    });

    await logAudit({ userId: req.user.id, userEmail: req.user.email, action: 'Assignment Created', entity: 'Assignment', entityId: assignment.id, details: { title, courseId } });
    await KafkaProducer.publishEvent('assignment-events', 'Assignment Created', { assignmentId: assignment.id, title, courseId, teacherId: req.user.id, dueDate });

    res.status(201).json({ success: true, assignment });
  } catch (err) { next(err); }
};

export const updateAssignment = async (req, res, next) => {
  try {
    const assignment = await Assignment.findByPk(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found.' });
    if (assignment.teacherId !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Forbidden.' });
    await assignment.update(req.body);
    res.json({ success: true, assignment });
  } catch (err) { next(err); }
};

export const deleteAssignment = async (req, res, next) => {
  try {
    const assignment = await Assignment.findByPk(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found.' });
    await assignment.destroy();
    res.json({ success: true, message: 'Assignment deleted.' });
  } catch (err) { next(err); }
};

export const submitAssignment = async (req, res, next) => {
  try {
    const assignment = await Assignment.findByPk(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found.' });

    const now = new Date();
    const isLate = now > new Date(assignment.dueDate);
    if (isLate && !assignment.allowLateSubmission) {
      return res.status(400).json({ success: false, message: 'Submission deadline has passed.' });
    }

    const fileUrl = req.file ? `/uploads/assignments/${req.file.filename}` : null;

    const [submission, created] = await AssignmentSubmission.findOrCreate({
      where: { assignmentId: assignment.id, studentId: req.user.id },
      defaults: { fileUrl, status: isLate ? 'late' : 'pending', submittedAt: now }
    });

    if (!created) {
      await submission.update({ fileUrl, status: isLate ? 'late' : 'pending', submittedAt: now });
    }

    await logAudit({ userId: req.user.id, userEmail: req.user.email, action: 'Assignment Submitted', entity: 'AssignmentSubmission', entityId: submission.id });
    await KafkaProducer.publishEvent('assignment-events', 'Assignment Submitted', {
      assignmentId: assignment.id, studentId: req.user.id, studentName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim(), title: assignment.title, isLate
    });

    res.json({ success: true, submission });
  } catch (err) { next(err); }
};

export const listSubmissions = async (req, res, next) => {
  try {
    const submissions = await AssignmentSubmission.findAll({
      where: { assignmentId: req.params.id },
      include: [{ model: User, as: 'student', attributes: ['id', 'email', 'firstName', 'lastName', 'profileImage'] }],
      order: [['submittedAt', 'DESC']]
    });
    res.json({ success: true, submissions });
  } catch (err) { next(err); }
};

export const gradeSubmission = async (req, res, next) => {
  try {
    const { marks, feedback } = req.body;
    const submission = await AssignmentSubmission.findByPk(req.params.submissionId, {
      include: [{ model: Assignment, as: 'assignment' }]
    });
    if (!submission) return res.status(404).json({ success: false, message: 'Submission not found.' });

    await submission.update({ marks, feedback, status: 'graded' });

    // Notify student
    const student = await User.findByPk(submission.studentId);
    if (student) {
      await NotificationService.createNotification(student.email, `Your submission for "${submission.assignment.title}" has been graded: ${marks}/${submission.assignment.maxMarks}.`, 'assignment_graded');
    }

    await KafkaProducer.publishEvent('assignment-events', 'Assignment Graded', { submissionId: submission.id, marks, studentId: submission.studentId });
    await logAudit({ userId: req.user.id, userEmail: req.user.email, action: 'Assignment Graded', entity: 'AssignmentSubmission', entityId: submission.id, details: { marks } });

    res.json({ success: true, submission });
  } catch (err) { next(err); }
};
