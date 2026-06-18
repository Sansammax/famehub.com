import { Quiz, QuizQuestion, QuizAttempt, Course, CourseEnrollment, User } from '../models/index.js';
import { logAudit } from '../utils/auditLogger.js';
import { KafkaProducer } from '../services/KafkaProducer.js';
import { NotificationService } from '../services/NotificationService.js';

export const listQuizzes = async (req, res, next) => {
  try {
    const { courseId } = req.query;
    const where = {};
    if (courseId) where.courseId = courseId;

    if (req.user.role === 'student') {
      where.isPublished = true;
      const enrollments = await CourseEnrollment.findAll({ where: { studentId: req.user.id }, attributes: ['courseId'] });
      where.courseId = enrollments.map(e => e.courseId);
    } else if (req.user.role === 'teacher' && !courseId) {
      where.teacherId = req.user.id;
    }

    const quizzes = await Quiz.findAll({
      where,
      include: [{ model: Course, as: 'course', attributes: ['id', 'title'] }],
      order: [['createdAt', 'DESC']]
    });

    // For students, attach attempt status
    if (req.user.role === 'student') {
      const withAttempt = await Promise.all(quizzes.map(async (q) => {
        const attempt = await QuizAttempt.findOne({ where: { quizId: q.id, studentId: req.user.id } });
        return { ...q.toJSON(), myAttempt: attempt };
      }));
      return res.json({ success: true, quizzes: withAttempt });
    }

    res.json({ success: true, quizzes });
  } catch (err) { next(err); }
};

export const getQuiz = async (req, res, next) => {
  try {
    const quiz = await Quiz.findByPk(req.params.id, {
      include: [
        { model: QuizQuestion, as: 'questions', order: [['orderIndex', 'ASC']] },
        { model: Course, as: 'course', attributes: ['id', 'title'] }
      ]
    });
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found.' });

    // Students should not see correct answers
    if (req.user.role === 'student') {
      const sanitized = { ...quiz.toJSON() };
      sanitized.questions = sanitized.questions.map(({ correctAnswers, ...q }) => q);
      return res.json({ success: true, quiz: sanitized });
    }
    res.json({ success: true, quiz });
  } catch (err) { next(err); }
};

export const createQuiz = async (req, res, next) => {
  try {
    const { courseId, title, description, duration, totalMarks, passingMarks, startAt, endAt, autoSubmit, questions } = req.body;
    if (!courseId || !title || !questions?.length) return res.status(400).json({ success: false, message: 'courseId, title, and at least one question are required.' });

    const quiz = await Quiz.create({
      courseId, teacherId: req.user.id, title, description,
      duration: duration || 30, totalMarks: totalMarks || 100,
      passingMarks: passingMarks || 40, isPublished: false,
      startAt: startAt ? new Date(startAt) : null,
      endAt: endAt ? new Date(endAt) : null,
      autoSubmit: autoSubmit !== false
    });

    // Bulk create questions
    const qData = questions.map((q, i) => ({
      quizId: quiz.id, questionText: q.questionText,
      type: q.type, options: q.options,
      correctAnswers: q.correctAnswers, marks: q.marks || 1, orderIndex: i
    }));
    await QuizQuestion.bulkCreate(qData);

    await logAudit({ userId: req.user.id, userEmail: req.user.email, action: 'Quiz Created', entity: 'Quiz', entityId: quiz.id, details: { title, courseId } });
    await KafkaProducer.publishEvent('quiz-events', 'Quiz Created', { quizId: quiz.id, title, courseId });

    res.status(201).json({ success: true, quiz });
  } catch (err) { next(err); }
};

export const updateQuiz = async (req, res, next) => {
  try {
    const quiz = await Quiz.findByPk(req.params.id);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found.' });
    if (quiz.teacherId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Forbidden.' });

    await quiz.update(req.body);

    // If publishing for first time, notify enrolled students
    if (req.body.isPublished && !quiz.isPublished) {
      const enrollments = await CourseEnrollment.findAll({ where: { courseId: quiz.courseId } });
      for (const e of enrollments) {
        const student = await User.findByPk(e.studentId);
        if (student) {
          await NotificationService.createNotification(student.email, `New quiz available: "${quiz.title}". Check your course page.`, 'quiz_available');
        }
      }
      await KafkaProducer.publishEvent('quiz-events', 'Quiz Published', { quizId: quiz.id, title: quiz.title, courseId: quiz.courseId });
    }
    res.json({ success: true, quiz });
  } catch (err) { next(err); }
};

export const deleteQuiz = async (req, res, next) => {
  try {
    const quiz = await Quiz.findByPk(req.params.id);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found.' });
    await quiz.destroy();
    res.json({ success: true, message: 'Quiz deleted.' });
  } catch (err) { next(err); }
};

export const startOrSubmitAttempt = async (req, res, next) => {
  try {
    const quiz = await Quiz.findByPk(req.params.id, { include: [{ model: QuizQuestion, as: 'questions' }] });
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found.' });
    if (!quiz.isPublished) return res.status(400).json({ success: false, message: 'Quiz is not published yet.' });

    const { answers, submit } = req.body;

    let attempt = await QuizAttempt.findOne({ where: { quizId: quiz.id, studentId: req.user.id } });

    if (!attempt) {
      // Starting a new attempt
      attempt = await QuizAttempt.create({
        quizId: quiz.id, studentId: req.user.id,
        answers: answers || {}, status: 'in_progress'
      });
      return res.json({ success: true, attempt, action: 'started' });
    }

    if (attempt.status !== 'in_progress') {
      return res.status(400).json({ success: false, message: 'Quiz already submitted.' });
    }

    // Save answers
    await attempt.update({ answers: answers || attempt.answers });

    if (submit) {
      // Auto-grade
      let score = 0;
      for (const question of quiz.questions) {
        const studentAnswer = (answers || {})[question.id];
        if (studentAnswer !== undefined) {
          const correct = JSON.stringify(
            Array.isArray(studentAnswer) ? studentAnswer.sort() : [studentAnswer]
          ) === JSON.stringify(question.correctAnswers.slice().sort());
          if (correct) score += question.marks;
        }
      }

      await attempt.update({
        score,
        passed: score >= quiz.passingMarks,
        submittedAt: new Date(),
        status: 'submitted'
      });

      await logAudit({ userId: req.user.id, userEmail: req.user.email, action: 'Quiz Submitted', entity: 'QuizAttempt', entityId: attempt.id, details: { quizId: quiz.id, score } });
      await KafkaProducer.publishEvent('quiz-events', 'Quiz Submitted', { attemptId: attempt.id, quizId: quiz.id, studentId: req.user.id, score, passed: attempt.passed });

      return res.json({ success: true, attempt, action: 'submitted', score, passed: attempt.passed });
    }

    res.json({ success: true, attempt, action: 'saved' });
  } catch (err) { next(err); }
};

export const getResults = async (req, res, next) => {
  try {
    const attempts = await QuizAttempt.findAll({
      where: { quizId: req.params.id },
      include: [{ model: User, as: 'student', attributes: ['id', 'email', 'firstName', 'lastName'] }],
      order: [['submittedAt', 'DESC']]
    });
    const passed = attempts.filter(a => a.passed).length;
    const avgScore = attempts.length ? (attempts.reduce((s, a) => s + (a.score || 0), 0) / attempts.length).toFixed(1) : 0;
    res.json({ success: true, attempts, stats: { total: attempts.length, passed, failed: attempts.length - passed, avgScore } });
  } catch (err) { next(err); }
};

export const getMyAttempt = async (req, res, next) => {
  try {
    const attempt = await QuizAttempt.findByPk(req.params.attemptId, {
      include: [{ model: Quiz, as: 'quiz', include: [{ model: QuizQuestion, as: 'questions' }] }]
    });
    if (!attempt) return res.status(404).json({ success: false, message: 'Attempt not found.' });
    if (attempt.studentId !== req.user.id && req.user.role !== 'teacher' && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Forbidden.' });
    res.json({ success: true, attempt });
  } catch (err) { next(err); }
};
