import express from 'express';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';
import {
  listUsers, getUser, createUser, updateUser,
  deleteUser, resetPassword, uploadAvatar as uploadAvatarCtrl
} from '../controllers/userController.js';
import { uploadAvatar } from '../utils/fileStorage.js';

const router = express.Router();

// All user routes require authentication
router.use(verifyToken);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: List all users with pagination, search and filters
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/', requireRole('admin', 'teacher'), listUsers);

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 */
router.post('/', requireRole('admin'), createUser);

router.get('/:id', getUser);
router.put('/:id', requireRole('admin'), updateUser);
router.delete('/:id', requireRole('admin'), deleteUser);
router.post('/:id/reset-password', requireRole('admin'), resetPassword);
router.post('/:id/avatar', (req, res, next) => {
  uploadAvatar(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    next();
  });
}, uploadAvatarCtrl);

export default router;
