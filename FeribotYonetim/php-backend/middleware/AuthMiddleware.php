<?php
/**
 * Kimlik doğrulama middleware'leri
 */

class AuthMiddleware {
    /**
     * Kullanıcının giriş yapmış olmasını gerektirir
     */
    public static function isAuthenticated(): callable {
        return function (array $params): bool {
            if (session_status() === PHP_SESSION_NONE) session_start();

            if (empty($_SESSION['user_id'])) {
                Response::unauthorized('Lütfen giriş yapınız');
                return false;
            }
            return true;
        };
    }

    /**
     * Admin yetkisi gerektirir
     */
    public static function isAdmin(): callable {
        return function (array $params): bool {
            if (session_status() === PHP_SESSION_NONE) session_start();

            if (empty($_SESSION['user_id'])) {
                Response::unauthorized('Lütfen giriş yapınız');
                return false;
            }

            $role = $_SESSION['user_role'] ?? 'user';
            if (!in_array($role, ['admin', 'superadmin'])) {
                Response::forbidden('Bu işlem için admin yetkisi gereklidir');
                return false;
            }
            return true;
        };
    }

    /**
     * SuperAdmin yetkisi gerektirir
     */
    public static function isSuperAdmin(): callable {
        return function (array $params): bool {
            if (session_status() === PHP_SESSION_NONE) session_start();

            if (empty($_SESSION['user_id'])) {
                Response::unauthorized('Lütfen giriş yapınız');
                return false;
            }

            if (($_SESSION['user_role'] ?? '') !== 'superadmin') {
                Response::forbidden('Bu işlem için süper admin yetkisi gereklidir');
                return false;
            }
            return true;
        };
    }

    /**
     * Acente yetkisi gerektirir
     */
    public static function isAgent(): callable {
        return function (array $params): bool {
            if (session_status() === PHP_SESSION_NONE) session_start();

            if (empty($_SESSION['user_id'])) {
                Response::unauthorized('Lütfen giriş yapınız');
                return false;
            }

            $role = $_SESSION['user_role'] ?? 'user';
            if (!in_array($role, ['agency', 'agency_staff', 'admin', 'superadmin'])) {
                Response::forbidden('Bu işlem için acente yetkisi gereklidir');
                return false;
            }
            return true;
        };
    }

    /**
     * Mevcut oturumdaki kullanıcı bilgisini döndürür
     */
    public static function currentUser(): ?array {
        if (session_status() === PHP_SESSION_NONE) session_start();

        if (empty($_SESSION['user_id'])) return null;

        return [
            'id' => $_SESSION['user_id'],
            'username' => $_SESSION['username'] ?? '',
            'email' => $_SESSION['user_email'] ?? '',
            'role' => $_SESSION['user_role'] ?? 'user',
            'fullName' => $_SESSION['user_fullname'] ?? '',
        ];
    }
}
