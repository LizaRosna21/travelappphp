<?php
/**
 * JSON Response yardımcı sınıfı
 */

class Response {
    public static function json(mixed $data, int $statusCode = 200): void {
        http_response_code($statusCode);
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    public static function success(mixed $data = null, string $message = 'Başarılı', int $statusCode = 200): void {
        self::json([
            'success' => true,
            'message' => $message,
            'data' => $data,
        ], $statusCode);
    }

    public static function error(string $message = 'Hata oluştu', int $statusCode = 400, mixed $errors = null): void {
        $response = [
            'success' => false,
            'message' => $message,
        ];
        if ($errors !== null) {
            $response['errors'] = $errors;
        }
        self::json($response, $statusCode);
    }

    public static function paginated(array $data, int $total, int $page, int $perPage): void {
        self::json([
            'success' => true,
            'data' => $data,
            'pagination' => [
                'total' => $total,
                'page' => $page,
                'per_page' => $perPage,
                'total_pages' => (int)ceil($total / $perPage),
            ],
        ]);
    }

    public static function notFound(string $message = 'Kayıt bulunamadı'): void {
        self::error($message, 404);
    }

    public static function unauthorized(string $message = 'Yetkiniz yok'): void {
        self::error($message, 401);
    }

    public static function forbidden(string $message = 'Erişim engellendi'): void {
        self::error($message, 403);
    }
}
