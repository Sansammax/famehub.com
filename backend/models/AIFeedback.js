import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const AIFeedback = sequelize.define('AIFeedback', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  submissionId: { type: DataTypes.UUID, allowNull: false, unique: true },
  feedback: { type: DataTypes.TEXT, allowNull: false },
  suggestedMarks: { type: DataTypes.INTEGER, allowNull: true },
  plagiarismScore: { type: DataTypes.FLOAT, defaultValue: 0.0 },
  weakSections: { type: DataTypes.JSON, allowNull: true }
});

export { AIFeedback };
export default AIFeedback;
