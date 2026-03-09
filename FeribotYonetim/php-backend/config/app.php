<?php
/**
 * Feribot Yönetim Sistemi - Uygulama Yapılandırması
 */

// .env dosyasını yükle
function loadEnv(string $path): void {
    if (!file_exists($path)) return;

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) continue;

        $pos = strpos($line, '=');
        if ($pos === false) continue;

        $key = trim(substr($line, 0, $pos));
        $value = trim(substr($line, $pos + 1));

        // Remove surrounding quotes
        if ((str_starts_with($value, '"') && str_ends_with($value, '"')) ||
            (str_starts_with($value, "'") && str_ends_with($value, "'"))) {
            $value = substr($value, 1, -1);
        }

        if (!getenv($key)) {
            putenv("$key=$value");
            $_ENV[$key] = $value;
        }
    }
}

// .env yükle
loadEnv(__DIR__ . '/../../.env');

// Uygulama sabitleri
define('APP_NAME', 'Feribot Yönetim Sistemi');
define('APP_VERSION', '2.0.0-php');
define('APP_ENV', getenv('NODE_ENV') ?: 'development');
define('APP_DEBUG', APP_ENV !== 'production');
define('APP_URL', getenv('SITE_URL') ?: 'http://localhost:8080');
define('CORS_ORIGIN', getenv('CORS_ORIGIN') ?: '*');
define('SESSION_SECRET', getenv('SESSION_SECRET') ?: 'default-secret-change-me');
define('DEMO_MODE', filter_var(getenv('DEMO_MODE') ?: 'false', FILTER_VALIDATE_BOOLEAN));

// Zaman dilimi
date_default_timezone_set('Europe/Istanbul');

// Hata yönetimi
if (APP_DEBUG) {
    error_reporting(E_ALL);
    ini_set('display_errors', '1');
} else {
    error_reporting(E_ALL & ~E_NOTICE & ~E_DEPRECATED);
    ini_set('display_errors', '0');
    ini_set('log_errors', '1');
    ini_set('error_log', __DIR__ . '/../logs/php-error.log');
}

// Session yapılandırma
ini_set('session.cookie_httponly', '1');
ini_set('session.cookie_secure', APP_ENV === 'production' ? '1' : '0');
ini_set('session.cookie_samesite', 'Lax');
ini_set('session.gc_maxlifetime', '86400'); // 24 saat
