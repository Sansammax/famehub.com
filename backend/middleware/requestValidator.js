import { validationResult, body, param, query } from 'express-validator';

export const validateRequest = (validations) => {
  return async (req, res, next) => {
    for (let validation of validations) {
      await validation.run(req);
    }

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({ field: err.path, message: err.msg }))
    });
  };
};

export const userValidationRules = [
  body('email').isEmail().withMessage('Must be a valid email address').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('role').isIn(['admin', 'teacher', 'student']).withMessage('Role must be admin, teacher, or student'),
  body('firstName').trim().notEmpty().withMessage('First name is required').escape(),
  body('lastName').trim().notEmpty().withMessage('Last name is required').escape(),
  body('phone').optional().trim().escape()
];

export const userUpdateValidationRules = [
  body('email').optional().isEmail().withMessage('Must be a valid email address').normalizeEmail(),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('role').optional().isIn(['admin', 'teacher', 'student']).withMessage('Role must be admin, teacher, or student'),
  body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty').escape(),
  body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty').escape(),
  body('phone').optional().trim().escape(),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
];

export const loginValidationRules = [
  body('email').isEmail().withMessage('Must be a valid email address').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required')
];

export const courseValidationRules = [
  body('title').trim().notEmpty().withMessage('Course title is required').escape(),
  body('code').trim().notEmpty().withMessage('Course code is required').escape(),
  body('departmentId').optional().isInt().withMessage('Department ID must be an integer'),
  body('teacherId').optional().isInt().withMessage('Teacher ID must be an integer')
];

export const departmentValidationRules = [
  body('name').trim().notEmpty().withMessage('Department name is required').escape(),
  body('code').trim().notEmpty().withMessage('Department code is required').escape()
];

export const quizValidationRules = [
  body('title').trim().notEmpty().withMessage('Quiz title is required').escape(),
  body('courseId').isInt().withMessage('Course ID must be an integer'),
  body('duration').optional().isInt({ min: 1 }).withMessage('Duration must be positive integer minutes')
];
