import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const AIChatHistory = sequelize.define('AIChatHistory', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  role: { type: DataTypes.ENUM('user', 'assistant'), allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  courseId: { type: DataTypes.UUID, allowNull: true }
});

export { AIChatHistory };
export default AIChatHistory;
