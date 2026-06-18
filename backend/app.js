import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';

import authRoutes from './routes/authRoutes.js';
import liveRoutes from './routes/liveRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import userRoutes from './routes/userRoutes.js';
import departmentRoutes from './routes/departmentRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import assignmentRoutes from './routes/assignmentRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import metricsRoutes from './routes/metricsRoutes.js';
import aiRoutes from './src/ai/routes/aiRoutes.js';

import { apiLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import { swaggerSpec } from './utils/swagger.js';
import { UPLOAD_BASE } from './utils/fileStorage.js';

import { httpLogger } from './middleware/httpLogger.js';
import { compressionMiddleware } from './middleware/compression.js';
import { csrfMiddleware } from './middleware/csrfMiddleware.js';
import { metricsMiddleware } from './middleware/metricsMiddleware.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://cdn.jsdelivr.net", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://images.unsplash.com", "https://ui-avatars.com", "https://i.pravatar.cc", "https://illustrations.popsy.co"]
    }
  }
}));

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(csrfMiddleware);
app.use(httpLogger);
app.use(compressionMiddleware);
app.use(metricsMiddleware);

// Serve uploaded files
app.use('/uploads', express.static(UPLOAD_BASE));

// ─── Health & Metrics ────────────────────────────────────────────────────────
app.use('/health', healthRoutes);
app.use('/metrics', metricsRoutes);

// Apply rate limits to API
app.use('/api', apiLimiter);

// ─── Core Routes ─────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/live', liveRoutes);
app.use('/api/analytics', analyticsRoutes);

// ─── Phase 3 Routes ───────────────────────────────────────────────────────────
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/ai', aiRoutes);

// ─── Swagger Docs ─────────────────────────────────────────────────────────────
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'FameHub LMS API Docs',
  customCss: '.swagger-ui .topbar { background-color: #4f46e5; }'
}));

// ─── 404 + Error Handlers ─────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.status(404).json({ success: false, message: 'API Route not found.' });
});

app.use(errorHandler);

export default app;
export { app };
