<?php
/**
 * POST /api/auth/login
 * Kullanıcı girişi
 */

function handleLogin(array $params): void {
    $data = Request::validate([
        'username' => 'required|min:3',
        'password' => 'required|min:6',
    ]);

    global $db;
    $userModel = new UserModel($db);

    // Find by username or email
    $user = $userModel->findByUsername($data['username']);
    if (!$user) {
        $user = $userModel->findByEmail($data['username']);
    }

    if (!$user) {
        Response::error('Kullanıcı adı veya şifre hatalı', 401);
    }

    if (!$user['is_active']) {
        Response::error('Hesabınız devre dışı bırakılmış', 403);
    }

    if (!$userModel->verifyPassword($data['password'], $user['password'])) {
        Response::error('Kullanıcı adı veya şifre hatalı', 401);
    }

    // Session oluştur
    if (session_status() === PHP_SESSION_NONE) session_start();

    $_SESSION['user_id'] = $user['id'];
    $_SESSION['username'] = $user['username'];
    $_SESSION['user_email'] = $user['email'];
    $_SESSION['user_role'] = $user['role'];
    $_SESSION['user_fullname'] = $user['full_name'];

    // Son giriş zamanını güncelle
    $userModel->updateLastLogin($user['id']);

    Response::success($userModel->safeFields($user), 'Giriş başarılı');
}
