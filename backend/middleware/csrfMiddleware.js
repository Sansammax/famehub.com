import crypto from 'crypto';

export const csrfMiddleware = (req, res, next) => {
  if (process.env.CSRF_ENABLED !== 'true') {
    return next();
  }

  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    let csrfToken = req.cookies?.['csrfToken'];
    if (!csrfToken) {
      csrfToken = crypto.randomBytes(24).toString('hex');
      res.cookie('csrfToken', csrfToken, {
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        httpOnly: false // accessible by JS
      });
    }
    return next();
  }

  const cookieToken = req.cookies?.['csrfToken'];
  const headerToken = req.headers['x-csrf-token'];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or missing CSRF token'
    });
  }

  next();
};
