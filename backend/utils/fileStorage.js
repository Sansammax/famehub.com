import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_BASE = path.join(__dirname, '..', 'uploads');

// Ensure upload dirs exist
['assignments', 'avatars', 'course-covers'].forEach(dir => {
  const fullPath = path.join(UPLOAD_BASE, dir);
  if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
});

const storage = (subfolder) => multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(UPLOAD_BASE, subfolder)),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  }
});

const allowedMimeTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm'
];

const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype)) cb(null, true);
  else cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
};

export const uploadAssignment = multer({
  storage: storage('assignments'),
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
}).single('file');

export const uploadAvatar = multer({
  storage: storage('avatars'),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
}).single('avatar');

export const uploadCourseCover = multer({
  storage: storage('course-covers'),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
}).single('cover');

// Serve uploaded files statically — call in app.js:
// app.use('/uploads', express.static(UPLOAD_BASE));
export { UPLOAD_BASE };
