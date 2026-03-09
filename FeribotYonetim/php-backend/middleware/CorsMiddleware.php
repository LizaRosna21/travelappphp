<?php
/**
 * CORS Middleware
 */

class CorsMiddleware {
    public static function handle(): void {
        $origin = CORS_ORIGIN;

        header("Access-Control-Allow-Origin: $origin");
        header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS");
        header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
        header("Access-Control-Allow-Credentials: true");
        header("Access-Control-Max-Age: 86400");

        // Preflight request
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
    }
}
