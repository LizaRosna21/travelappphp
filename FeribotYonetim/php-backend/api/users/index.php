<?php
/**
 * Kullanıcı API endpoint'leri
 */

function handleGetProfile(array $params): void {
    $currentUser = AuthMiddleware::currentUser();
    global $db;
    $userModel = new UserModel($db);

    $user = $userModel->findById($currentUser['id']);
    Response::success($userModel->safeFields($user));
}

function handleUpdateProfile(array $params): void {
    $currentUser = AuthMiddleware::currentUser();
    global $db;
    $userModel = new UserModel($db);

    $body = Request::body();
    $allowedFields = ['full_name', 'phone_number', 'profile_image', 'preferences'];
    $updateData = array_intersect_key($body, array_flip($allowedFields));

    if (empty($updateData)) {
        Response::error('Güncellenecek alan bulunamadı', 400);
    }

    $user = $userModel->update($currentUser['id'], $updateData);
    Response::success($userModel->safeFields($user), 'Profil güncellendi');
}

function handleChangePassword(array $params): void {
    $data = Request::validate([
        'current_password' => 'required',
        'new_password' => 'required|min:6',
    ]);

    $currentUser = AuthMiddleware::currentUser();
    global $db;
    $userModel = new UserModel($db);

    $user = $userModel->findById($currentUser['id']);

    if (!$userModel->verifyPassword($data['current_password'], $user['password'])) {
        Response::error('Mevcut şifre hatalı', 400);
    }

    $newHash = password_hash($data['new_password'], PASSWORD_BCRYPT, ['cost' => 10]);
    $userModel->update($currentUser['id'], ['password' => $newHash]);

    Response::success(null, 'Şifre değiştirildi');
}

function handleAdminUpdateUser(array $params): void {
    global $db;
    $userModel = new UserModel($db);

    $user = $userModel->findById((int)$params['id']);
    if (!$user) {
        Response::notFound('Kullanıcı bulunamadı');
    }

    $body = Request::body();
    $allowedFields = ['full_name', 'phone_number', 'role', 'is_active', 'email'];
    $updateData = array_intersect_key($body, array_flip($allowedFields));

    $updated = $userModel->update((int)$params['id'], $updateData);
    Response::success($userModel->safeFields($updated), 'Kullanıcı güncellendi');
}
