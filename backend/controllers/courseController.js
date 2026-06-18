import { Op } from 'sequelize';
import { Course, CourseEnrollment, User, Department, Assignment, Quiz } from '../models/index.js';
import { logAudit } from '../utils/auditLogger.js';
import { KafkaProducer } from '../services/KafkaProducer.js';
import { NotificationService } from '../services/NotificationService.js';
import { getOrSet, invalidatePattern } from '../utils/redisCache.js';

export const listCourses = async (req, res, next) => {
  try {
    const { search = '', department, archived = 'false', teacherId, studentId } = req.query;
    const role = req.user ? req.user.role : 'none';
    const cacheKey = `courses:list:${role}:${search}:${department}:${archived}:${teacherId}:${studentId}`;

    const cachedResult = await getOrSet(cacheKey, 30, async () => {
      const where = { isArchived: archived === 'true' };
      if (search) where.title = { [Op.like]: `%${search}%` };
      if (department) where.departmentId = department;
      if (teacherId) where.teacherId = teacherId;

      let include = [
        { model: User, as: 'teacher', attributes: ['id', 'email', 'firstName', 'lastName'] },
        { model: Department, as: 'department', attributes: ['id', 'name'] }
      ];

      // If requesting as a specific student, filter by enrollment
      if (studentId || (req.user && req.user.role === 'student')) {
        const sid = studentId || req.user.id;
        include.push({ model: User, as: 'students', where: { id: sid }, required: true, attributes: [] });
      }

      const courses = await Course.findAll({ where, include, order: [['createdAt', 'DESC']] });
      return { courses };
    });

    res.json({ success: true, ...cachedResult });
  } catch (err) { next(err); }
};

export const getCourse = async (req, res, next) => {
  try {
    const course = await Course.findByPk(req.params.id, {
      include: [
        { model: User, as: 'teacher', attributes: ['id', 'email', 'firstName', 'lastName'] },
        { model: Department, as: 'department', attributes: ['id', 'name'] },
        { model: User, as: 'students', attributes: ['id', 'email', 'firstName', 'lastName'], through: { attributes: ['enrolledAt', 'completionRate'] } },
        { model: Assignment, as: 'assignments', attributes: ['id', 'title', 'dueDate', 'maxMarks'] },
        { model: Quiz, as: 'quizzes', attributes: ['id', 'title', 'duration', 'isPublished'] }
      ]
    });
    if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });
    res.json({ success: true, course });
  } catch (err) { next(err); }
};

export const createCourse = async (req, res, next) => {
  try {
    const { title, description, departmentId, maxStudents } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Course title required.' });
    const teacherId = req.user.role === 'teacher' ? req.user.id : req.body.teacherId;
    const coverImage = req.file ? `/uploads/course-covers/${req.file.filename}` : null;

    const course = await Course.create({ title, description, departmentId, teacherId, maxStudents, coverImage });

    await logAudit({ userId: req.user.id, userEmail: req.user.email, action: 'Course Created', entity: 'Course', entityId: course.id, details: { title } });
    await KafkaProducer.publishEvent('course-events', 'Course Created', { courseId: course.id, title, teacherId });
    await invalidatePattern('courses:list:*');

    res.status(201).json({ success: true, course });
  } catch (err) { next(err); }
};

export const updateCourse = async (req, res, next) => {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });
    if (req.user.role === 'teacher' && course.teacherId !== req.user.id)
      return res.status(403).json({ success: false, message: 'Not your course.' });

    await course.update(req.body);
    await logAudit({ userId: req.user.id, userEmail: req.user.email, action: 'Course Updated', entity: 'Course', entityId: course.id });
    await invalidatePattern('courses:list:*');
    res.json({ success: true, course });
  } catch (err) { next(err); }
};

export const deleteCourse = async (req, res, next) => {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });
    await course.update({ isArchived: true });
    await logAudit({ userId: req.user.id, userEmail: req.user.email, action: 'Course Archived', entity: 'Course', entityId: course.id });
    await invalidatePattern('courses:list:*');
    res.json({ success: true, message: 'Course archived.' });
  } catch (err) { next(err); }
};

export const enrollStudents = async (req, res, next) => {
  try {
    const { studentIds } = req.body;
    const course = await Course.findByPk(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });

    const enrollments = await Promise.all(
      studentIds.map(sid => CourseEnrollment.findOrCreate({
        where: { courseId: course.id, studentId: sid },
        defaults: { courseId: course.id, studentId: sid }
      }))
    );

    await KafkaProducer.publishEvent('course-events', 'Students Enrolled', { courseId: course.id, studentIds });
    await invalidatePattern('courses:list:*');
    res.json({ success: true, enrolled: enrollments.length });
  } catch (err) { next(err); }
};

export const removeStudent = async (req, res, next) => {
  try {
    await CourseEnrollment.destroy({ where: { courseId: req.params.id, studentId: req.params.studentId } });
    await invalidatePattern('courses:list:*');
    res.json({ success: true, message: 'Student removed from course.' });
  } catch (err) { next(err); }
};

export const getCourseStudents = async (req, res, next) => {
  try {
    const course = await Course.findByPk(req.params.id, {
      include: [{ model: User, as: 'students', attributes: ['id', 'email', 'firstName', 'lastName', 'profileImage'], through: { attributes: ['enrolledAt', 'completionRate'] } }]
    });
    if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });
    res.json({ success: true, students: course.students });
  } catch (err) { next(err); }
};
