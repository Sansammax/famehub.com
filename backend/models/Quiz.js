import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Quiz = sequelize.define('Quiz', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  courseId: { type: DataTypes.UUID, allowNull: false },
  teacherId: { type: DataTypes.UUID, allowNull: false },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  duration: { type: DataTypes.INTEGER, defaultValue: 30 }, // minutes
  totalMarks: { type: DataTypes.INTEGER, defaultValue: 100 },
  passingMarks: { type: DataTypes.INTEGER, defaultValue: 40 },
  isPublished: { type: DataTypes.BOOLEAN, defaultValue: false },
  startAt: { type: DataTypes.DATE, allowNull: true },
  endAt: { type: DataTypes.DATE, allowNull: true },
  autoSubmit: { type: DataTypes.BOOLEAN, defaultValue: true }
});

const QuizQuestion = sequelize.define('QuizQuestion', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  quizId: { type: DataTypes.UUID, allowNull: false },
  questionText: { type: DataTypes.TEXT, allowNull: false },
  type: {
    type: DataTypes.ENUM('mcq', 'multi', 'truefalse'),
    allowNull: false, defaultValue: 'mcq'
  },
  options: { type: DataTypes.JSON, allowNull: true },       // array of strings
  correctAnswers: { type: DataTypes.JSON, allowNull: false }, // array of indices or 'true'/'false'
  marks: { type: DataTypes.INTEGER, defaultValue: 1 },
  orderIndex: { type: DataTypes.INTEGER, defaultValue: 0 }
});

const QuizAttempt = sequelize.define('QuizAttempt', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  quizId: { type: DataTypes.UUID, allowNull: false },
  studentId: { type: DataTypes.UUID, allowNull: false },
  answers: { type: DataTypes.JSON, defaultValue: {} }, // { questionId: answer }
  score: { type: DataTypes.FLOAT, defaultValue: 0 },
  passed: { type: DataTypes.BOOLEAN, defaultValue: false },
  startedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  submittedAt: { type: DataTypes.DATE, allowNull: true },
  status: {
    type: DataTypes.ENUM('in_progress', 'submitted', 'auto_submitted'),
    defaultValue: 'in_progress'
  }
});

export { Quiz, QuizQuestion, QuizAttempt };
