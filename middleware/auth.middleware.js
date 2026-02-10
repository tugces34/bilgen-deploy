const jwt = require('jsonwebtoken');

// Verify JWT Token
const verifyToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token gereklidir'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'bilgen-secret-key');
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    req.userRoles = decoded.roles || [];

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Geçersiz token'
    });
  }
};

// Check if user has required role
const checkRole = (requiredRoles) => {
  return (req, res, next) => {
    if (!req.userRoles || req.userRoles.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Yetkisiz erişim'
      });
    }

    const hasRole = requiredRoles.some(role => req.userRoles.includes(role));

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için yetkiniz yok'
      });
    }

    next();
  };
};

module.exports = {
  verifyToken,
  checkRole
};
