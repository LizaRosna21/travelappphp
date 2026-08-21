<?php

class UserModel extends BaseModel {
    protected string $table = 'users';

    public function findByUsername(string $username): ?array {
        return $this->findOne(['username' => $username]);
    }

    public function findByEmail(string $email): ?array {
        return $this->findOne(['email' => $email]);
    }

    public function createUser(array $data): array {
        $data['password'] = password_hash($data['password'], PASSWORD_BCRYPT, ['cost' => 10]);
        $data['created_at'] = date('Y-m-d H:i:s');
        $data['is_active'] = $data['is_active'] ?? true;
        $data['role'] = $data['role'] ?? 'user';
        $data['preferences'] = $data['preferences'] ?? '{}';
        return $this->create($data);
    }

    public function verifyPassword(string $password, string $hash): bool {
        return password_verify($password, $hash);
    }

    public function updateLastLogin(int $userId): void {
        $this->update($userId, ['last_login_at' => date('Y-m-d H:i:s')]);
    }

    public function getAdmins(): array {
        return $this->query(
            "SELECT id, username, email, full_name, role, is_active, created_at, last_login_at
             FROM users WHERE role IN ('admin', 'superadmin') ORDER BY id"
        );
    }

    public function searchUsers(string $search, int $limit = 20): array {
        return $this->query(
            "SELECT id, username, email, full_name, role, is_active, created_at
             FROM users
             WHERE username ILIKE :search OR email ILIKE :search OR full_name ILIKE :search
             ORDER BY id DESC LIMIT :limit",
            [':search' => "%$search%", ':limit' => $limit]
        );
    }

    public function getUserStats(): array {
        return $this->queryOne(
            "SELECT
                COUNT(*) as total_users,
                COUNT(*) FILTER (WHERE role = 'admin' OR role = 'superadmin') as admin_count,
                COUNT(*) FILTER (WHERE role = 'agency') as agency_count,
                COUNT(*) FILTER (WHERE role = 'user') as user_count,
                COUNT(*) FILTER (WHERE is_active = true) as active_count,
                COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as new_last_30_days
             FROM users"
        );
    }

    public function safeFields(array $user): array {
        unset($user['password']);
        return $user;
    }
}
