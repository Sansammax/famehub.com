import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Attendance = sequelize.define('Attendance', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userEmail: {
    type: DataTypes.STRING,
    allowNull: false
  },
  userName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'student'
  },
  meetingId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  joinTime: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  leaveTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  durationSeconds: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('Present', 'Absent', 'Partial'),
    defaultValue: 'Absent',
    allowNull: false
  }
});

export { Attendance };
export default Attendance;
