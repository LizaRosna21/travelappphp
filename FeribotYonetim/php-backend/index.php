<?php
/**
 * ============================================
 * FERİBOT YÖNETİM SİSTEMİ - PHP Backend
 * ============================================
 * Ana giriş noktası (Front Controller)
 * Tüm API istekleri bu dosya üzerinden yönlendirilir
 */

// Yapılandırma
require_once __DIR__ . '/config/app.php';
require_once __DIR__ . '/config/database.php';

// Core sınıflar
require_once __DIR__ . '/core/Router.php';
require_once __DIR__ . '/core/Request.php';
require_once __DIR__ . '/core/Response.php';

// Middleware
require_once __DIR__ . '/middleware/AuthMiddleware.php';
require_once __DIR__ . '/middleware/CorsMiddleware.php';

// Modeller
require_once __DIR__ . '/models/BaseModel.php';
require_once __DIR__ . '/models/User.php';
require_once __DIR__ . '/models/Route.php';
require_once __DIR__ . '/models/Schedule.php';
require_once __DIR__ . '/models/Booking.php';
require_once __DIR__ . '/models/Agency.php';
require_once __DIR__ . '/models/Port.php';
require_once __DIR__ . '/models/Campaign.php';
require_once __DIR__ . '/models/SiteSettings.php';
require_once __DIR__ . '/models/Review.php';

// API handler'lar
require_once __DIR__ . '/api/auth/login.php';
require_once __DIR__ . '/api/auth/register.php';
require_once __DIR__ . '/api/auth/logout.php';
require_once __DIR__ . '/api/auth/me.php';
require_once __DIR__ . '/api/routes/index.php';
require_once __DIR__ . '/api/schedules/index.php';
require_once __DIR__ . '/api/bookings/index.php';
require_once __DIR__ . '/api/admin/dashboard.php';
require_once __DIR__ . '/api/users/index.php';
require_once __DIR__ . '/api/b2b/index.php';
require_once __DIR__ . '/api/marketing/index.php';
require_once __DIR__ . '/api/translations/index.php';
require_once __DIR__ . '/api/health/index.php';

// ============================================
// CORS ve Headers
// ============================================
header('Content-Type: application/json; charset=utf-8');
CorsMiddleware::handle();

// ============================================
// Session başlat
// ============================================
session_start();

// ============================================
// Veritabanı bağlantısı
// ============================================
try {
    $database = new Database();
    $db = $database->getConnection();
} catch (Exception $e) {
    Response::error('Veritabanı bağlantı hatası: ' . $e->getMessage(), 500);
}

// ============================================
// Router
// ============================================
$router = new Router();

// --- Health Check ---
$router->get('/api/health', 'handleHealthCheck');

// --- Auth Routes (Public) ---
$router->post('/api/auth/login', 'handleLogin');
$router->post('/api/auth/register', 'handleRegister');
$router->post('/api/auth/logout', 'handleLogout');
$router->get('/api/auth/me', 'handleMe', [AuthMiddleware::isAuthenticated()]);

// --- Routes (Public) ---
$router->get('/api/routes', 'handleGetRoutes');
$router->get('/api/routes/search', 'handleSearchRoutes');
$router->get('/api/routes/:id', 'handleGetRoute');

// --- Routes (Admin) ---
$router->post('/api/routes', 'handleCreateRoute', [AuthMiddleware::isAdmin()]);
$router->put('/api/routes/:id', 'handleUpdateRoute', [AuthMiddleware::isAdmin()]);
$router->delete('/api/routes/:id', 'handleDeleteRoute', [AuthMiddleware::isAdmin()]);

// --- Schedules ---
$router->get('/api/schedules', 'handleGetSchedules');
$router->get('/api/schedules/:id', 'handleGetSchedule');
$router->post('/api/schedules', 'handleCreateSchedule', [AuthMiddleware::isAdmin()]);
$router->put('/api/schedules/:id', 'handleUpdateSchedule', [AuthMiddleware::isAdmin()]);
$router->delete('/api/schedules/:id', 'handleDeleteSchedule', [AuthMiddleware::isAdmin()]);

// --- Bookings ---
$router->get('/api/bookings', 'handleGetBookings', [AuthMiddleware::isAuthenticated()]);
$router->get('/api/bookings/pnr/:pnr', 'handleGetBookingByPNR');
$router->get('/api/bookings/:id', 'handleGetBooking', [AuthMiddleware::isAuthenticated()]);
$router->post('/api/bookings', 'handleCreateBooking', [AuthMiddleware::isAuthenticated()]);
$router->put('/api/bookings/:id', 'handleUpdateBooking', [AuthMiddleware::isAuthenticated()]);
$router->post('/api/bookings/:id/cancel', 'handleCancelBooking', [AuthMiddleware::isAuthenticated()]);
$router->post('/api/bookings/:id/confirm-payment', 'handleConfirmPayment', [AuthMiddleware::isAdmin()]);

// --- User Profile ---
$router->get('/api/users/profile', 'handleGetProfile', [AuthMiddleware::isAuthenticated()]);
$router->put('/api/users/profile', 'handleUpdateProfile', [AuthMiddleware::isAuthenticated()]);
$router->post('/api/users/change-password', 'handleChangePassword', [AuthMiddleware::isAuthenticated()]);
$router->put('/api/users/:id', 'handleAdminUpdateUser', [AuthMiddleware::isAdmin()]);

// --- Admin Dashboard ---
$router->get('/api/admin/dashboard', 'handleDashboard', [AuthMiddleware::isAdmin()]);
$router->get('/api/admin/bookings', 'handleAdminBookings', [AuthMiddleware::isAdmin()]);
$router->get('/api/admin/users', 'handleAdminUsers', [AuthMiddleware::isAdmin()]);
$router->get('/api/admin/routes', 'handleAdminRoutes', [AuthMiddleware::isAdmin()]);
$router->get('/api/admin/settings', 'handleAdminSettings', [AuthMiddleware::isAdmin()]);
$router->put('/api/admin/settings', 'handleAdminSettings', [AuthMiddleware::isAdmin()]);
$router->get('/api/admin/revenue', 'handleAdminRevenue', [AuthMiddleware::isAdmin()]);

// --- B2B / Agencies ---
$router->get('/api/agencies', 'handleGetAgencies', [AuthMiddleware::isAdmin()]);
$router->get('/api/agencies/:id', 'handleGetAgency', [AuthMiddleware::isAdmin()]);
$router->post('/api/agencies', 'handleCreateAgency', [AuthMiddleware::isAdmin()]);
$router->put('/api/agencies/:id', 'handleUpdateAgency', [AuthMiddleware::isAdmin()]);
$router->get('/api/agencies/:id/payments', 'handleGetAgencyPayments', [AuthMiddleware::isAdmin()]);

// --- Marketing / Campaigns ---
$router->get('/api/campaigns', 'handleGetCampaigns', [AuthMiddleware::isAdmin()]);
$router->get('/api/campaigns/:id', 'handleGetCampaign', [AuthMiddleware::isAdmin()]);
$router->post('/api/campaigns', 'handleCreateCampaign', [AuthMiddleware::isAdmin()]);
$router->post('/api/campaigns/validate-coupon', 'handleValidateCoupon');

// --- Translations / i18n ---
$router->get('/api/languages', 'handleGetLanguages');
$router->get('/api/translations', 'handleGetTranslations');
$router->get('/api/translations/:lang', 'handleGetTranslations');
$router->get('/api/currencies', 'handleGetCurrencies');
$router->get('/api/ports', 'handleGetPorts');

// ============================================
// İsteği yönlendir
// ============================================
$method = Request::method();
$uri = Request::uri();

// /api prefix'i olmadan gelen istekler için React frontend'e yönlendir
if (!str_starts_with($uri, '/api/') && !str_starts_with($uri, '/api')) {
    // Static dosya kontrolü yap, yoksa React SPA index.html döndür
    $publicPath = __DIR__ . '/../dist/public' . $uri;
    if (file_exists($publicPath) && is_file($publicPath)) {
        // Static dosya sun
        $mimeTypes = [
            'css' => 'text/css',
            'js' => 'application/javascript',
            'json' => 'application/json',
            'png' => 'image/png',
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'gif' => 'image/gif',
            'svg' => 'image/svg+xml',
            'ico' => 'image/x-icon',
            'woff' => 'font/woff',
            'woff2' => 'font/woff2',
            'ttf' => 'font/ttf',
        ];

        $ext = pathinfo($publicPath, PATHINFO_EXTENSION);
        $contentType = $mimeTypes[$ext] ?? 'application/octet-stream';

        header("Content-Type: $contentType");
        header('Content-Type: ' . $contentType);
        readfile($publicPath);
        exit;
    }

    // React SPA - index.html
    $indexPath = __DIR__ . '/../dist/public/index.html';
    if (file_exists($indexPath)) {
        header('Content-Type: text/html; charset=utf-8');
        readfile($indexPath);
        exit;
    }

    Response::error('Sayfa bulunamadı', 404);
}

$router->resolve($method, $uri);
