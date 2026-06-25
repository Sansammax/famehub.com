import { sequelize } from '../config/database.js';
import { User } from './User.js';
import { Meeting } from './Meeting.js';
import { Attendance } from './Attendance.js';
import { Notification } from './Notification.js';
import { Department } from './Department.js';
import { Course, CourseEnrollment } from './Course.js';
import { Assignment, AssignmentSubmission } from './Assignment.js';
import { Quiz, QuizQuestion, QuizAttempt } from './Quiz.js';
import { AuditLog } from './AuditLog.js';
import { RefreshToken } from './RefreshToken.js';
import { AIChatHistory } from './AIChatHistory.js';
import { AISummary } from './AISummary.js';
import { AIRecommendations } from './AIRecommendations.js';
import { AIQuizGeneration } from './AIQuizGeneration.js';
import { AIFeedback } from './AIFeedback.js';
import { AIMetrics } from './AIMetrics.js';

// ─── Associations ────────────────────────────────────────────────────────────

// Department → Users
Department.hasMany(User, { foreignKey: 'departmentId', as: 'members' });
User.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });

// Department → Courses
Department.hasMany(Course, { foreignKey: 'departmentId', as: 'courses' });
Course.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });

// User (teacher) → Course
User.hasMany(Course, { foreignKey: 'teacherId', as: 'taughtCourses' });
Course.belongsTo(User, { foreignKey: 'teacherId', as: 'teacher' });

// Course ↔ Students (through enrollment)
Course.belongsToMany(User, { through: CourseEnrollment, foreignKey: 'courseId', otherKey: 'studentId', as: 'students' });
User.belongsToMany(Course, { through: CourseEnrollment, foreignKey: 'studentId', otherKey: 'courseId', as: 'enrolledCourses' });

// Course/User → Meetings
Course.hasMany(Meeting, { foreignKey: 'courseId', as: 'meetings' });
Meeting.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });
User.hasMany(Meeting, { foreignKey: 'teacherId', as: 'meetings' });
Meeting.belongsTo(User, { foreignKey: 'teacherId', as: 'teacher' });

// Course → Assignments
Course.hasMany(Assignment, { foreignKey: 'courseId', as: 'assignments' });
Assignment.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });
User.hasMany(Assignment, { foreignKey: 'teacherId', as: 'createdAssignments' });
Assignment.belongsTo(User, { foreignKey: 'teacherId', as: 'teacher' });

// Assignment → Submissions
Assignment.hasMany(AssignmentSubmission, { foreignKey: 'assignmentId', as: 'submissions' });
AssignmentSubmission.belongsTo(Assignment, { foreignKey: 'assignmentId', as: 'assignment' });
User.hasMany(AssignmentSubmission, { foreignKey: 'studentId', as: 'submissions' });
AssignmentSubmission.belongsTo(User, { foreignKey: 'studentId', as: 'student' });

// Course → Quizzes
Course.hasMany(Quiz, { foreignKey: 'courseId', as: 'quizzes' });
Quiz.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });
User.hasMany(Quiz, { foreignKey: 'teacherId', as: 'createdQuizzes' });
Quiz.belongsTo(User, { foreignKey: 'teacherId', as: 'teacher' });

// Quiz → Questions
Quiz.hasMany(QuizQuestion, { foreignKey: 'quizId', as: 'questions' });
QuizQuestion.belongsTo(Quiz, { foreignKey: 'quizId', as: 'quiz' });

// Quiz → Attempts
Quiz.hasMany(QuizAttempt, { foreignKey: 'quizId', as: 'attempts' });
QuizAttempt.belongsTo(Quiz, { foreignKey: 'quizId', as: 'quiz' });
User.hasMany(QuizAttempt, { foreignKey: 'studentId', as: 'quizAttempts' });
QuizAttempt.belongsTo(User, { foreignKey: 'studentId', as: 'student' });

// User ↔ RefreshTokens
User.hasMany(RefreshToken, { foreignKey: 'userId', as: 'refreshTokens' });
RefreshToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// AI model associations
User.hasMany(AIChatHistory, { foreignKey: 'userId', as: 'chatHistories' });
AIChatHistory.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(AIMetrics, { foreignKey: 'userId', as: 'aiMetrics' });
AIMetrics.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasOne(AIRecommendations, { foreignKey: 'studentId', as: 'recommendations' });
AIRecommendations.belongsTo(User, { foreignKey: 'studentId', as: 'student' });

Course.hasMany(AIQuizGeneration, { foreignKey: 'courseId', as: 'generatedQuizzes' });
AIQuizGeneration.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });

User.hasMany(AIQuizGeneration, { foreignKey: 'teacherId', as: 'createdAiQuizzes' });
AIQuizGeneration.belongsTo(User, { foreignKey: 'teacherId', as: 'teacher' });

AssignmentSubmission.hasOne(AIFeedback, { foreignKey: 'submissionId', as: 'aiFeedback' });
AIFeedback.belongsTo(AssignmentSubmission, { foreignKey: 'submissionId', as: 'submission' });


// ─── Init & Seed ─────────────────────────────────────────────────────────────

const initDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('[Database] Connection established successfully.');

    await sequelize.sync({ alter: true });
    console.log('[Database] Models synchronized.');

    const userCount = await User.count();
    if (userCount === 0) {
      console.log('[Database] Seeding default data...');

      // Seed departments
      const [engDept, csDept] = await Department.bulkCreate([
        { name: 'Engineering', description: 'Software & Computer Engineering' },
        { name: 'Computer Science', description: 'CS Theory & Applications' }
      ]);

      // Seed users
      const [admin, teacher, student] = await User.bulkCreate([
        { email: 'admin@famehub.edu', password: 'password', role: 'admin',
          firstName: 'System', lastName: 'Admin', isActive: true, departmentId: engDept.id },
        { email: 'teacher@famehub.edu', password: 'password', role: 'teacher',
          firstName: 'Prof.', lastName: 'Smith', isActive: true, departmentId: engDept.id },
        { email: 'student@famehub.edu', password: 'password', role: 'student',
          firstName: 'Alice', lastName: 'Johnson', isActive: true, departmentId: csDept.id }
      ], { individualHooks: true });

      // Seed courses
      const [course1, course2] = await Course.bulkCreate([
        { title: 'Advanced Mathematics 101', description: 'Calculus and Linear Algebra',
          departmentId: engDept.id, teacherId: teacher.id },
        { title: 'Computer Science Fundamentals', description: 'Data structures and algorithms',
          departmentId: csDept.id, teacherId: teacher.id }
      ]);

      // Enroll student
      await CourseEnrollment.bulkCreate([
        { courseId: course1.id, studentId: student.id },
        { courseId: course2.id, studentId: student.id }
      ]);

      // Seed a sample assignment
      await Assignment.create({
        courseId: course1.id, teacherId: teacher.id,
        title: 'Calculus Problem Set 1',
        description: 'Solve the attached differentiation problems.',
        dueDate: new Date(Date.now() + 7 * 24 * 3600000), // 7 days from now
        maxMarks: 100
      });

      // Seed a sample quiz
      const quiz = await Quiz.create({
        courseId: course1.id, teacherId: teacher.id,
        title: 'Math Fundamentals Quiz',
        description: 'Test on basic calculus',
        duration: 30, totalMarks: 30, passingMarks: 15,
        isPublished: true
      });

      await QuizQuestion.bulkCreate([
        {
          quizId: quiz.id, orderIndex: 1,
          questionText: 'What is the derivative of x²?',
          type: 'mcq', options: ['2x', 'x²', '2', 'x'],
          correctAnswers: [0], marks: 10
        },
        {
          quizId: quiz.id, orderIndex: 2,
          questionText: 'Is the derivative of a constant always zero?',
          type: 'truefalse', options: ['True', 'False'],
          correctAnswers: [0], marks: 10
        },
        {
          quizId: quiz.id, orderIndex: 3,
          questionText: 'Which of these are calculus concepts?',
          type: 'multi',
          options: ['Integration', 'Differentiation', 'Compilation', 'Limits'],
          correctAnswers: [0, 1, 3], marks: 10
        }
      ]);

      console.log('[Database] Default data seeded successfully.');
    }
  } catch (error) {
    console.error('[Database] Initialization error:', error);
  }
};

export {
  sequelize, initDatabase,
  User, Meeting, Attendance, Notification,
  Department, Course, CourseEnrollment,
  Assignment, AssignmentSubmission,
  Quiz, QuizQuestion, QuizAttempt,
  AuditLog, RefreshToken,
  AIChatHistory, AISummary, AIRecommendations,
  AIQuizGeneration, AIFeedback, AIMetrics
};

