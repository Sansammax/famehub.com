import { Department, User } from '../models/index.js';
import { logAudit } from '../utils/auditLogger.js';

export const listDepartments = async (req, res, next) => {
  try {
    const departments = await Department.findAll({
      include: [{ model: User, as: 'members', attributes: ['id', 'email', 'role', 'firstName', 'lastName'] }]
    });
    res.json({ success: true, departments });
  } catch (err) { next(err); }
};

export const createDepartment = async (req, res, next) => {
  try {
    const { name, description, headTeacherId } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Department name required.' });
    const dept = await Department.create({ name, description, headTeacherId });
    await logAudit({ userId: req.user.id, userEmail: req.user.email, action: 'Department Created', entity: 'Department', entityId: dept.id, details: { name } });
    res.status(201).json({ success: true, department: dept });
  } catch (err) { next(err); }
};

export const updateDepartment = async (req, res, next) => {
  try {
    const dept = await Department.findByPk(req.params.id);
    if (!dept) return res.status(404).json({ success: false, message: 'Department not found.' });
    await dept.update(req.body);
    await logAudit({ userId: req.user.id, userEmail: req.user.email, action: 'Department Updated', entity: 'Department', entityId: dept.id });
    res.json({ success: true, department: dept });
  } catch (err) { next(err); }
};

export const deleteDepartment = async (req, res, next) => {
  try {
    const dept = await Department.findByPk(req.params.id);
    if (!dept) return res.status(404).json({ success: false, message: 'Department not found.' });
    await dept.destroy();
    await logAudit({ userId: req.user.id, userEmail: req.user.email, action: 'Department Deleted', entity: 'Department', entityId: req.params.id });
    res.json({ success: true, message: 'Department deleted.' });
  } catch (err) { next(err); }
};
