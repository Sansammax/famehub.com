import { DataTypes } from 'sequelize';
import bcrypt from 'bcryptjs';
import { sequelize } from '../config/database.js';

const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  email: {
    type: DataTypes.STRING, allowNull: false, unique: true,
    validate: { isEmail: true }
  },
  password: { type: DataTypes.STRING, allowNull: false },
  role: {
    type: DataTypes.ENUM('admin', 'teacher', 'student'),
    allowNull: false, defaultValue: 'student'
  },
  firstName: { type: DataTypes.STRING, defaultValue: '' },
  lastName:  { type: DataTypes.STRING, defaultValue: '' },
  phone:     { type: DataTypes.STRING, allowNull: true },
  profileImage: { type: DataTypes.STRING, allowNull: true },
  isActive:  { type: DataTypes.BOOLEAN, defaultValue: true },
  lastLogin: { type: DataTypes.DATE, allowNull: true },
  departmentId: { type: DataTypes.UUID, allowNull: true }
}, {
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

User.prototype.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export { User };
export default User;
