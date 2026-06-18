import { Op } from 'sequelize';
import { AuditLog, User } from '../models/index.js';

export const listAuditLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 30, userEmail, action, entity, from, to } = req.query;
    const where = {};
    if (userEmail) where.userEmail = { [Op.like]: `%${userEmail}%` };
    if (action) where.action = { [Op.like]: `%${action}%` };
    if (entity) where.entity = entity;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt[Op.gte] = new Date(from);
      if (to) where.createdAt[Op.lte] = new Date(to);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, total: count, page: parseInt(page), pages: Math.ceil(count / limit), logs: rows });
  } catch (err) { next(err); }
};
