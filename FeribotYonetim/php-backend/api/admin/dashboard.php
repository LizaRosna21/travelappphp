<?php
/**
 * Admin Dashboard API endpoint'leri
 */

function handleDashboard(array $params): void {
    global $db;

    $bookingModel = new BookingModel($db);
    $routeModel = new RouteModel($db);
    $userModel = new UserModel($db);

    $bookingStats = $bookingModel->getBookingStats();
    $routeStats = $routeModel->getRouteStats();
    $userStats = $userModel->getUserStats();
    $recentBookings = $bookingModel->getRecentBookings(5);
    $revenueByRoute = $bookingModel->getRevenueByRoute();

    Response::success([
        'bookings' => $bookingStats,
        'routes' => $routeStats,
        'users' => $userStats,
        'recent_bookings' => $recentBookings,
        'revenue_by_route' => $revenueByRoute,
    ]);
}

function handleAdminBookings(array $params): void {
    global $db;
    $bookingModel = new BookingModel($db);

    $page = (int)(Request::query('page', 1));
    $perPage = (int)(Request::query('per_page', 20));
    $status = Request::query('status');

    $where = [];
    if ($status) $where['status'] = $status;

    $total = $bookingModel->count($where);
    $bookings = $bookingModel->findAll($where, 'created_at DESC', $perPage, ($page - 1) * $perPage);

    // Enrich with route & user data
    foreach ($bookings as &$booking) {
        $booking['route'] = (new RouteModel($db))->findById($booking['route_id']);
        $user = (new UserModel($db))->findById($booking['user_id']);
        $booking['user'] = $user ? (new UserModel($db))->safeFields($user) : null;
    }

    Response::paginated($bookings, $total, $page, $perPage);
}

function handleAdminUsers(array $params): void {
    global $db;
    $userModel = new UserModel($db);

    $search = Request::query('search');
    $page = (int)(Request::query('page', 1));
    $perPage = (int)(Request::query('per_page', 20));

    if ($search) {
        $users = $userModel->searchUsers($search, $perPage);
        Response::success($users);
    } else {
        $role = Request::query('role');
        $where = [];
        if ($role) $where['role'] = $role;

        $total = $userModel->count($where);
        $users = $userModel->findAll($where, 'id DESC', $perPage, ($page - 1) * $perPage);

        // Şifreleri kaldır
        $users = array_map(fn($u) => $userModel->safeFields($u), $users);

        Response::paginated($users, $total, $page, $perPage);
    }
}

function handleAdminRoutes(array $params): void {
    global $db;
    $routeModel = new RouteModel($db);

    $page = (int)(Request::query('page', 1));
    $perPage = (int)(Request::query('per_page', 50));

    $total = $routeModel->count();
    $routes = $routeModel->findAll([], 'id DESC', $perPage, ($page - 1) * $perPage);

    Response::paginated($routes, $total, $page, $perPage);
}

function handleAdminSettings(array $params): void {
    global $db;
    $settingsModel = new SiteSettingsModel($db);

    if (Request::method() === 'GET') {
        $settings = $settingsModel->getSettings();
        Response::success($settings);
    } else {
        $body = Request::body();
        $settings = $settingsModel->updateSettings($body);
        Response::success($settings, 'Ayarlar güncellendi');
    }
}

function handleAdminRevenue(array $params): void {
    global $db;
    $bookingModel = new BookingModel($db);

    $days = (int)(Request::query('days', 30));

    $dailyRevenue = $bookingModel->getDailyRevenue($days);
    $revenueByRoute = $bookingModel->getRevenueByRoute();
    $stats = $bookingModel->getBookingStats();

    Response::success([
        'daily' => $dailyRevenue,
        'by_route' => $revenueByRoute,
        'stats' => $stats,
    ]);
}
