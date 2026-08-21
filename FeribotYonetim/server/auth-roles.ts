// auth-roles.ts
// Yetkilendirme yapısı için rol temelli erişim kontrol sistemi

import { Express, Request, Response, NextFunction } from "express";

// Tüm kullanıcı rolleri
export enum UserRole {
  SUPERADMIN = "superadmin",
  ADMIN = "admin",
  AGENT = "agent",
  USER = "user"
}

// Her rol için izin verilen eylemler
export const RolePermissions = {
  [UserRole.SUPERADMIN]: [
    "manage_admins",
    "manage_users",
    "manage_agents",
    "manage_settings",
    "manage_routes",
    "manage_bookings",
    "manage_payments",
    "view_analytics",
    "view_reports",
    "manage_api",
    "manage_backups",
    "manage_marketing",
    "manage_system",
    "manage_content",
    "manage_all"
  ],
  [UserRole.ADMIN]: [
    "manage_users",
    "manage_agents",
    "manage_routes",
    "manage_bookings",
    "manage_payments",
    "view_analytics",
    "view_reports",
    "manage_marketing",
    "manage_content"
  ],
  [UserRole.AGENT]: [
    "manage_own_bookings",
    "view_own_analytics",
    "manage_client_users",
    "view_available_routes",
    "create_bookings"
  ],
  [UserRole.USER]: [
    "view_own_bookings",
    "create_bookings",
    "update_profile",
    "view_available_routes"
  ]
};

// Middleware oluşturucu - özel bir izin gerektiren işlemler için
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const userRole = req.user?.role as UserRole;
    if (!userRole) {
      return res.status(403).json({ message: "Invalid user role" });
    }

    const permissions = RolePermissions[userRole] || [];
    
    // Superadmin her zaman tüm izinlere sahiptir
    if (userRole === UserRole.SUPERADMIN || permissions.includes(permission) || permissions.includes("manage_all")) {
      return next();
    }
    
    return res.status(403).json({ 
      message: "Permission denied", 
      requiredPermission: permission 
    });
  };
}

// Rol tabanlı erişim kontrolü middleware'i
export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const userRole = req.user?.role as UserRole;
    if (!userRole) {
      return res.status(403).json({ message: "Invalid user role" });
    }
    
    // Superadmin her zaman erişime sahiptir
    if (userRole === UserRole.SUPERADMIN || allowedRoles.includes(userRole)) {
      return next();
    }
    
    return res.status(403).json({ 
      message: "Role-based access denied", 
      userRole: userRole,
      requiredRoles: allowedRoles 
    });
  };
}

// Kullanıcının kendi verilerine erişim kontrolü
export function requireSelfOrHigherRole(paramIdField: string = "id") {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const userRole = req.user?.role as UserRole;
    const userId = req.user?.id;
    const paramId = parseInt(req.params[paramIdField]);
    
    // Kullanıcı kendi verilerine erişebilir
    if (userId === paramId) {
      return next();
    }
    
    // Admin ve Superadmin tüm kullanıcılara erişebilir
    if (userRole === UserRole.SUPERADMIN || userRole === UserRole.ADMIN) {
      return next();
    }
    
    // Agent sadece kendi müşterilerine erişebilir (Bu özel bir kontrol gerektirir)
    if (userRole === UserRole.AGENT) {
      // Bu kısım veritabanına göre özelleştirilmelidir
      // Örneğin: storage.isUserClientOfAgent(paramId, userId)
      // Şimdilik basit bir kısıtlama olarak geçiyoruz
      return res.status(403).json({ message: "Agent can only access their clients" });
    }
    
    return res.status(403).json({ message: "Access denied to this resource" });
  };
}

// Sistem korumalı rotalar için middleware'leri ayarla
export function setupAuthRoutes(app: Express) {
  // Superadmin Routes
  app.use("/api/superadmin/*", requireRole([UserRole.SUPERADMIN]));
  
  // Admin Routes
  app.use("/api/admin/*", requireRole([UserRole.SUPERADMIN, UserRole.ADMIN]));
  
  // Agent Routes
  app.use("/api/agent/*", requireRole([UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.AGENT]));
  
  // User specific routes (örneğin profil)
  app.use("/api/users/:id", requireSelfOrHigherRole("id"));
  
  // Yetkilendirme bilgilerini döndür
  app.get("/api/auth/permissions", (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const role = req.user?.role as UserRole;
    const permissions = RolePermissions[role] || [];
    
    res.json({
      role,
      permissions,
      user: {
        id: req.user?.id,
        username: req.user?.username,
        email: req.user?.email,
        fullName: req.user?.fullName
      }
    });
  });
}