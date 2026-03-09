<?php
/**
 * GET /api/health
 * Sistem sağlık kontrolü
 */

function handleHealthCheck(array $params): void {
    global $db;

    try {
        $dbCheck = (new Database())->testConnection();
    } catch (Exception $e) {
        $dbCheck = ['status' => 'error', 'message' => $e->getMessage()];
    }

    $health = [
        'status' => $dbCheck['status'] === 'connected' ? 'healthy' : 'degraded',
        'version' => APP_VERSION,
        'php_version' => PHP_VERSION,
        'timestamp' => date('c'),
        'environment' => APP_ENV,
        'database' => $dbCheck,
        'memory' => [
            'usage' => round(memory_get_usage(true) / 1024 / 1024, 2) . ' MB',
            'peak' => round(memory_get_peak_usage(true) / 1024 / 1024, 2) . ' MB',
        ],
    ];

    $statusCode = $health['status'] === 'healthy' ? 200 : 503;
    Response::json($health, $statusCode);
}
