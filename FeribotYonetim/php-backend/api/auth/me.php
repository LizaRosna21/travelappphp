<?php
/**
 * GET /api/auth/me
 * Mevcut kullanıcı bilgisi
 */

function handleMe(array $params): void {
    $currentUser = AuthMiddleware::currentUser();
    if (!$currentUser) {
        Response::unauthorized();
    }

    global $db;
    $userModel = new UserModel($db);
    $user = $userModel->findById($currentUser['id']);

    if (!$user) {
        Response::unauthorized('Kullanıcı bulunamadı');
    }

    Response::success($userModel->safeFields($user));
}
