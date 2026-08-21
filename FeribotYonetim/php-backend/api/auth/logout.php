<?php
/**
 * POST /api/auth/logout
 */

function handleLogout(array $params): void {
    if (session_status() === PHP_SESSION_NONE) session_start();
    session_destroy();
    Response::success(null, 'Çıkış yapıldı');
}
