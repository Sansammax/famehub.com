import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User, RefreshToken } from '../models/index.js';
import { jwtConfig } from '../config/jwt.js';
import { KafkaProducer } from '../services/KafkaProducer.js';
import { logger } from '../utils/logger.js';

const generateToken = (user) => {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, jwtConfig.secret, {
    expiresIn: '15m' // Stricter access token lifetime
  });
};

const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const generateRefreshToken = async (userId) => {
  const token = crypto.randomBytes(40).toString('hex');
  const hashedToken = hashToken(token);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await RefreshToken.create({
    userId,
    token: hashedToken,
    expiresAt
  });

  return token;
};

const sendTokenResponse = async (user, statusCode, res) => {
  const token = generateToken(user);
  const refreshToken = await generateRefreshToken(user.id);

  const cookieOptions = {
    httpOnly: true,
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  };

  res.cookie('refreshToken', refreshToken, cookieOptions);

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role
    }
  });
};

export const register = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password.' });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already registered with this email address.' });
    }

    const user = await User.create({ email, password, role });

    logger.audit('User Signup', email, { role: user.role });
    await KafkaProducer.publishEvent('user-events', 'User Signup', { email: user.email, role: user.role });

    await sendTokenResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide an email and password.' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication failed. Invalid credentials.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Authentication failed. Invalid credentials.' });
    }

    logger.audit('User Login', email, { role: user.role });
    await KafkaProducer.publishEvent('user-events', 'User Login', { email: user.email, role: user.role });

    await sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Refresh token missing' });
    }

    const hashedToken = hashToken(token);
    const refreshTokenRecord = await RefreshToken.findOne({
      where: { token: hashedToken, revokedAt: null }
    });

    if (!refreshTokenRecord) {
      return res.status(401).json({ success: false, message: 'Invalid or revoked refresh token' });
    }

    if (new Date() > refreshTokenRecord.expiresAt) {
      return res.status(401).json({ success: false, message: 'Expired refresh token' });
    }

    const user = await User.findByPk(refreshTokenRecord.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    // Token rotation: revoke old token
    refreshTokenRecord.revokedAt = new Date();
    await refreshTokenRecord.save();

    logger.info(`Rotated refresh token for user: ${user.email}`);

    await sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;
    if (token) {
      const hashedToken = hashToken(token);
      const refreshTokenRecord = await RefreshToken.findOne({
        where: { token: hashedToken }
      });
      if (refreshTokenRecord) {
        refreshTokenRecord.revokedAt = new Date();
        await refreshTokenRecord.save();
      }
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role
      }
    });
  } catch (error) {
    next(error);
  }
};
