import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const AuditLog = sequelize.define('AuditLog', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: true },
  userEmail: { type: DataTypes.STRING, allowNull: false },
  action: { type: DataTypes.STRING, allowNull: false },
  entity: { type: DataTypes.STRING, allowNull: true },
  entityId: { type: DataTypes.STRING, allowNull: true },
  details: { type: DataTypes.JSON, allowNull: true },
  ipAddress: { type: DataTypes.STRING, allowNull: true }
}, { updatedAt: false });

export { AuditLog };
export default AuditLog;
