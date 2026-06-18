import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const AIRecommendations = sequelize.define('AIRecommendations', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  studentId: { type: DataTypes.UUID, allowNull: false, unique: true },
  weakTopics: { type: DataTypes.JSON, allowNull: true },
  nextLessons: { type: DataTypes.JSON, allowNull: true },
  practiceQuizzes: { type: DataTypes.JSON, allowNull: true },
  schedule: { type: DataTypes.TEXT, allowNull: true }
});

export { AIRecommendations };
export default AIRecommendations;
