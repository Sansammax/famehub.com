import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const AIQuizGeneration = sequelize.define('AIQuizGeneration', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  courseId: { type: DataTypes.UUID, allowNull: false },
  teacherId: { type: DataTypes.UUID, allowNull: false },
  sourceFile: { type: DataTypes.STRING, allowNull: true },
  questions: { type: DataTypes.JSON, allowNull: false },
  status: { type: DataTypes.ENUM('pending', 'approved'), defaultValue: 'pending', allowNull: false }
});

export { AIQuizGeneration };
export default AIQuizGeneration;
