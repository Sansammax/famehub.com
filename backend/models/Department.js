import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Department = sequelize.define('Department', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false, unique: true },
  description: { type: DataTypes.TEXT, allowNull: true },
  headTeacherId: { type: DataTypes.UUID, allowNull: true }
});

export { Department };
export default Department;
