import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const AIMetrics = sequelize.define('AIMetrics', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  promptTokens: { type: DataTypes.INTEGER, defaultValue: 0 },
  completionTokens: { type: DataTypes.INTEGER, defaultValue: 0 },
  provider: { type: DataTypes.STRING, defaultValue: 'mock' },
  cost: { type: DataTypes.FLOAT, defaultValue: 0.0 },
  action: { type: DataTypes.STRING, allowNull: false }
});

export { AIMetrics };
export default AIMetrics;
