import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Assignment = sequelize.define('Assignment', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  courseId: { type: DataTypes.UUID, allowNull: false },
  teacherId: { type: DataTypes.UUID, allowNull: false },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  dueDate: { type: DataTypes.DATE, allowNull: false },
  maxMarks: { type: DataTypes.INTEGER, defaultValue: 100 },
  rubric: { type: DataTypes.JSON, allowNull: true },
  fileUrl: { type: DataTypes.STRING, allowNull: true },
  allowLateSubmission: { type: DataTypes.BOOLEAN, defaultValue: false }
});

const AssignmentSubmission = sequelize.define('AssignmentSubmission', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  assignmentId: { type: DataTypes.UUID, allowNull: false },
  studentId: { type: DataTypes.UUID, allowNull: false },
  fileUrl: { type: DataTypes.STRING, allowNull: true },
  submittedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  marks: { type: DataTypes.FLOAT, allowNull: true },
  feedback: { type: DataTypes.TEXT, allowNull: true },
  status: {
    type: DataTypes.ENUM('pending', 'graded', 'late'),
    defaultValue: 'pending'
  }
});

export { Assignment, AssignmentSubmission };
