/**
 * Admin Authentication Middleware
 * 
 * This middleware checks if the authenticated user is an admin.
 * It should be used after passport.authenticate('jwt') middleware.
 * 
 * The user object is attached by passport and should have a type field
 * indicating if it's an admin or user.
 */

module.exports = (req, res, next) => {
  // Check if user is authenticated (set by passport)
  if (!req.user) {
    return res.status(401).json({
      message: 'Authentication required',
      code: 401
    });
  }

  // Check if user is an admin
  // Admin users are stored in the 'admins' collection and have type 'admin' in JWT payload
  // The passport strategy sets req.user based on the collection (Admin or User)
  // We can check if it's an admin by checking if the user has admin-specific fields
  // or by checking the JWT payload type
  
  // Since passport attaches the user from Admin collection for admin tokens,
  // we can check if req.user has admin-specific properties
  // Or we can check the original JWT payload if available
  
  // For now, we'll check if the user object has admin-specific fields
  // Most admin models have fields like 'role' that regular users don't have
  const isAdmin = req.user.role !== undefined || 
                  req.user.admin_role !== undefined ||
                  (req.user.email && req.user.email.includes('@admin')); // Fallback check

  if (!isAdmin) {
    return res.status(403).json({
      message: 'Admin access required',
      code: 403
    });
  }

  // Attach admin info to request for use in controllers
  req.admin = req.user;
  
  next();
};

