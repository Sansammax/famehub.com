import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Course = sequelize.define('Course', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  departmentId: { type: DataTypes.UUID, allowNull: true },
  teacherId: { type: DataTypes.UUID, allowNull: true },
  isArchived: { type: DataTypes.BOOLEAN, defaultValue: false },
  coverImage: { type: DataTypes.STRING, allowNull: true },
  maxStudents: { type: DataTypes.INTEGER, defaultValue: 50 }
});

const CourseEnrollment = sequelize.define('CourseEnrollment', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  courseId: { type: DataTypes.UUID, allowNull: false },
  studentId: { type: DataTypes.UUID, allowNull: false },
  completionRate: { type: DataTypes.FLOAT, defaultValue: 0 },
  enrolledAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

export { Course, CourseEnrollment };
