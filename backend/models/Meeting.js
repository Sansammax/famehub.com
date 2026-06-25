import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Meeting = sequelize.define('Meeting', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  meetingId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  moderatorPW: {
    type: DataTypes.STRING,
    allowNull: false
  },
  attendeePW: {
    type: DataTypes.STRING,
    allowNull: false
  },
  isRunning: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  record: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  courseId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  teacherId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  startTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  endedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
});

export { Meeting };
export default Meeting;
