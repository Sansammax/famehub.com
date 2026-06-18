import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const AISummary = sequelize.define('AISummary', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  meetingId: { type: DataTypes.STRING, allowNull: false, unique: true },
  summary: { type: DataTypes.TEXT, allowNull: false },
  concepts: { type: DataTypes.JSON, allowNull: true },
  questions: { type: DataTypes.JSON, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true }
});

export { AISummary };
export default AISummary;
