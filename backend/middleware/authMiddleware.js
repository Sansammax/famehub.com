import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt.js';
import { User } from '../models/User.js';

// Verifies Bearer JWT token in headers
export const protect = async (req, res, next) => {
  let token;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Not authorized. Token signature is missing.' 
    });
  }

  try {
    const decoded = jwt.verify(token, jwtConfig.secret);
    
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Authorization failed. User record no longer exists.' 
      });
    }

    req.user = user;
    if (decoded && decoded.role) {
      req.user.role = decoded.role;
    }
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      message: 'Token verification failed. Signature is invalid or has expired.' 
    });
  }
};

// Enforces role-based permissions
export const authorize = (...roles) => {
  return (req, res, next) => {
    console.log("Authenticated User:", req.user);
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role "${req.user ? req.user.role : 'none'}" lacks permissions for this endpoint.`
      });
    }
    next();
  };
};

// Aliases for Phase 3 controllers
export const verifyToken = protect;
export const requireRole = (...roles) => authorize(...roles);

