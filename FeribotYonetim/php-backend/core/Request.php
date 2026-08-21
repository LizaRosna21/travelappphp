<?php
/**
 * Request yardımcı sınıfı
 */

class Request {
    private static ?array $bodyCache = null;

    public static function method(): string {
        return $_SERVER['REQUEST_METHOD'];
    }

    public static function uri(): string {
        return $_SERVER['REQUEST_URI'];
    }

    public static function body(): array {
        if (self::$bodyCache === null) {
            $raw = file_get_contents('php://input');
            self::$bodyCache = json_decode($raw, true) ?? [];
        }
        return self::$bodyCache;
    }

    public static function get(string $key, mixed $default = null): mixed {
        return self::body()[$key] ?? $_GET[$key] ?? $default;
    }

    public static function query(string $key, mixed $default = null): mixed {
        return $_GET[$key] ?? $default;
    }

    public static function has(string $key): bool {
        return isset(self::body()[$key]) || isset($_GET[$key]);
    }

    public static function only(array $keys): array {
        $body = self::body();
        $result = [];
        foreach ($keys as $key) {
            if (isset($body[$key])) {
                $result[$key] = $body[$key];
            }
        }
        return $result;
    }

    public static function validate(array $rules): array {
        $body = self::body();
        $errors = [];
        $validated = [];

        foreach ($rules as $field => $rule) {
            $rulesParts = explode('|', $rule);
            $value = $body[$field] ?? null;

            foreach ($rulesParts as $r) {
                $r = trim($r);

                if ($r === 'required' && ($value === null || $value === '')) {
                    $errors[$field] = "$field alanı zorunludur";
                    break;
                }

                if ($r === 'email' && $value !== null && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
                    $errors[$field] = "Geçerli bir e-posta giriniz";
                    break;
                }

                if ($r === 'numeric' && $value !== null && !is_numeric($value)) {
                    $errors[$field] = "$field sayısal olmalıdır";
                    break;
                }

                if ($r === 'integer' && $value !== null && !is_int($value) && !ctype_digit((string)$value)) {
                    $errors[$field] = "$field tam sayı olmalıdır";
                    break;
                }

                if ($r === 'boolean' && $value !== null && !is_bool($value) && $value !== 0 && $value !== 1) {
                    $errors[$field] = "$field doğru/yanlış olmalıdır";
                    break;
                }

                if (str_starts_with($r, 'min:')) {
                    $min = (int)substr($r, 4);
                    if ($value !== null && strlen((string)$value) < $min) {
                        $errors[$field] = "$field en az $min karakter olmalıdır";
                        break;
                    }
                }

                if (str_starts_with($r, 'max:')) {
                    $max = (int)substr($r, 4);
                    if ($value !== null && strlen((string)$value) > $max) {
                        $errors[$field] = "$field en fazla $max karakter olmalıdır";
                        break;
                    }
                }
            }

            if (!isset($errors[$field]) && $value !== null) {
                $validated[$field] = $value;
            }
        }

        if (!empty($errors)) {
            Response::error('Doğrulama hatası', 422, $errors);
        }

        return $validated;
    }

    public static function file(string $key): ?array {
        return $_FILES[$key] ?? null;
    }

    public static function header(string $key): ?string {
        $key = 'HTTP_' . strtoupper(str_replace('-', '_', $key));
        return $_SERVER[$key] ?? null;
    }

    public static function bearerToken(): ?string {
        $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (str_starts_with($auth, 'Bearer ')) {
            return substr($auth, 7);
        }
        return null;
    }

    public static function ip(): string {
        return $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    }
}
