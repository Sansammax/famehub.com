import { AuditLog } from '../models/index.js';
import { KafkaProducer } from '../services/KafkaProducer.js';

/**
 * Logs an action to the database audit trail and Kafka.
 * @param {object} opts
 * @param {string} opts.userId
 * @param {string} opts.userEmail
 * @param {string} opts.action       e.g. 'User Login', 'Assignment Created'
 * @param {string} [opts.entity]     e.g. 'Assignment'
 * @param {string} [opts.entityId]   UUID of the affected record
 * @param {object} [opts.details]    Extra context
 * @param {string} [opts.ipAddress]
 */
export const logAudit = async ({ userId, userEmail, action, entity, entityId, details, ipAddress }) => {
  try {
    await AuditLog.create({ userId, userEmail, action, entity, entityId, details, ipAddress });
    await KafkaProducer.publishEvent('audit-events', action, {
      userId, userEmail, action, entity, entityId, details
    });
  } catch (err) {
    console.error('[AuditLogger] Failed to write audit log:', err.message);
  }
};

/** Express middleware that reads IP from request */
export const auditMiddleware = (action, entity) => async (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = async (data) => {
    if (res.statusCode < 400 && req.user) {
      await logAudit({
        userId: req.user.id,
        userEmail: req.user.email,
        action,
        entity,
        entityId: req.params.id || (data && data[entity?.toLowerCase()] && data[entity.toLowerCase()].id),
        details: { method: req.method, path: req.path },
        ipAddress: req.ip
      });
    }
    return originalJson(data);
  };
  next();
};

export default logAudit;
