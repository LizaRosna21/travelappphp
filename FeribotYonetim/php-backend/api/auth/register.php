<?php
/**
 * POST /api/auth/register
 * Yeni kullanıcı kaydı
 */

function handleRegister(array $params): void {
    $data = Request::validate([
        'username' => 'required|min:3|max:50',
        'password' => 'required|min:6|max:100',
        'email' => 'required|email',
    ]);

    global $db;
    $userModel = new UserModel($db);

    // Benzersizlik kontrolü
    if ($userModel->findByUsername($data['username'])) {
        Response::error('Bu kullanıcı adı zaten kullanılıyor', 409);
    }

    if ($userModel->findByEmail($data['email'])) {
        Response::error('Bu e-posta adresi zaten kayıtlı', 409);
    }

    $body = Request::body();
    $userData = [
        'username' => $data['username'],
        'password' => $data['password'],
        'email' => $data['email'],
        'full_name' => $body['fullName'] ?? $body['full_name'] ?? null,
        'phone_number' => $body['phoneNumber'] ?? $body['phone_number'] ?? null,
        'role' => 'user',
    ];

    $user = $userModel->createUser($userData);

    // Otomatik giriş yap
    if (session_status() === PHP_SESSION_NONE) session_start();
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['username'] = $user['username'];
    $_SESSION['user_email'] = $user['email'];
    $_SESSION['user_role'] = $user['role'];
    $_SESSION['user_fullname'] = $user['full_name'];

    Response::success($userModel->safeFields($user), 'Kayıt başarılı', 201);
}
