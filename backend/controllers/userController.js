import { Op } from 'sequelize';
import { User, Department } from '../models/index.js';
import { logAudit } from '../utils/auditLogger.js';
import { KafkaProducer } from '../services/KafkaProducer.js';
import path from 'path';

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: List all users (admin only)
 *     tags: [Users]
 */
export const listUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = '', role, department, isActive } = req.query;
    const where = {};
    if (search) {
      where[Op.or] = [
        { email: { [Op.like]: `%${search}%` } },
        { firstName: { [Op.like]: `%${search}%` } },
        { lastName: { [Op.like]: `%${search}%` } }
      ];
    }
    if (role) where.role = role;
    if (department) where.departmentId = department;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      include: [{ model: Department, as: 'department', attributes: ['name'] }],
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, total: count, page: parseInt(page), pages: Math.ceil(count / limit), users: rows });
  } catch (err) { next(err); }
};

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get single user
 *     tags: [Users]
 */
export const getUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] },
      include: [{ model: Department, as: 'department' }]
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, user });
  } catch (err) { next(err); }
};

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create user (admin only)
 *     tags: [Users]
 */
export const createUser = async (req, res, next) => {
  try {
    const { email, password, role, firstName, lastName, phone, departmentId } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required.' });
    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(409).json({ success: false, message: 'Email already registered.' });

    const user = await User.create({ email, password, role, firstName, lastName, phone, departmentId, isActive: true });
    await logAudit({ userId: req.user.id, userEmail: req.user.email, action: 'User Created', entity: 'User', entityId: user.id, details: { email, role } });
    await KafkaProducer.publishEvent('user-events', 'User Created', { email, role });

    res.status(201).json({ success: true, user: { id: user.id, email: user.email, role: user.role } });
  } catch (err) { next(err); }
};

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update user (admin only)
 *     tags: [Users]
 */
export const updateUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const { firstName, lastName, phone, role, departmentId, isActive } = req.body;
    await user.update({ firstName, lastName, phone, role, departmentId, isActive });

    await logAudit({ userId: req.user.id, userEmail: req.user.email, action: 'User Updated', entity: 'User', entityId: user.id, details: req.body });
    res.json({ success: true, user: { id: user.id, email: user.email, role: user.role, isActive: user.isActive } });
  } catch (err) { next(err); }
};

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Deactivate user (soft delete)
 *     tags: [Users]
 */
export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    await user.update({ isActive: false });
    await logAudit({ userId: req.user.id, userEmail: req.user.email, action: 'User Deactivated', entity: 'User', entityId: user.id });
    res.json({ success: true, message: 'User deactivated.' });
  } catch (err) { next(err); }
};

export const resetPassword = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    await user.update({ password: newPassword });
    await logAudit({ userId: req.user.id, userEmail: req.user.email, action: 'Password Reset', entity: 'User', entityId: user.id });
    res.json({ success: true, message: 'Password reset successfully.' });
  } catch (err) { next(err); }
};

export const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const fileUrl = `/uploads/avatars/${req.file.filename}`;
    await user.update({ profileImage: fileUrl });
    res.json({ success: true, profileImage: fileUrl });
  } catch (err) { next(err); }
};
