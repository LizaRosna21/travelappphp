/**
 * Authentication Middleware Module
 * 
 * Middleware functions for authentication and authorization
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to check if user is authenticated
 */
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  // Skip authentication in development/demo mode if query param is present
  if (process.env.NODE_ENV !== 'production' && req.query.skipAuth === 'true') {
    return next();
  }
  
  if (req.isAuthenticated()) {
    return next();
  }
  
  return res.status(401).json({ 
    success: false, 
    error: 'Authentication required' 
  });
}

/**
 * Middleware to check if user is an admin
 */
export function isAdmin(req: Request, res: Response, next: NextFunction) {
  // Skip admin check in development/demo mode if query param is present
  if (process.env.NODE_ENV !== 'production' && req.query.skipAuth === 'true') {
    return next();
  }
  
  if (req.isAuthenticated() && req.user && req.user.role === 'admin') {
    return next();
  }
  
  return res.status(403).json({ 
    success: false, 
    error: 'Administrator access required' 
  });
}

/**
 * Middleware to check if user is the owner of a booking
 */
export function isBookingOwner(req: Request, res: Response, next: NextFunction) {
  // Skip owner check in development/demo mode if query param is present
  if (process.env.NODE_ENV !== 'production' && req.query.skipAuth === 'true') {
    return next();
  }
  
  // This would check if the authenticated user is the owner of the booking
  // For now, we'll allow any authenticated user, but in a real app
  // you'd compare req.user.id with the booking.userId from the database
  if (req.isAuthenticated()) {
    return next();
  }
  
  return res.status(403).json({ 
    success: false, 
    error: 'You do not have permission to access this booking' 
  });
}

/**
 * Middleware to check if user is the owner of a booking or an admin
 */
export function isOwnerOrAdmin(req: Request, res: Response, next: NextFunction) {
  // Skip check in development/demo mode if query param is present
  if (process.env.NODE_ENV !== 'production' && req.query.skipAuth === 'true') {
    return next();
  }
  
  if (req.isAuthenticated()) {
    // Allow if user is admin
    if (req.user && req.user.role === 'admin') {
      return next();
    }
    
    // This would check if the authenticated user is the owner of the booking
    // For now, we'll allow any authenticated user, but in a real app
    // you'd compare req.user.id with the booking.userId from the database
    return next();
  }
  
  return res.status(403).json({ 
    success: false, 
    error: 'You do not have permission to access this booking' 
  });
}