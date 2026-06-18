import dotenv from 'dotenv';
dotenv.config();

export const jwtConfig = {
  secret: process.env.JWT_SECRET || 'famehub-enterprise-secret-key-2026-xyz',
  expiresIn: process.env.JWT_EXPIRES_IN || '7d'
};
