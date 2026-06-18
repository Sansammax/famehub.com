import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userEmail: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'all' // 'all' signifies a broadcast notification, otherwise links to specific user
  },
  message: {
    type: DataTypes.STRING,
    allowNull: false
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
});

export { Notification };
export default Notification;
