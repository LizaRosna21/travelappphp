<?php
/**
 * Rota API endpoint'leri
 */

function handleGetRoutes(array $params): void {
    global $db;
    $routeModel = new RouteModel($db);

    $filter = Request::query('filter');

    if ($filter === 'featured') {
        $routes = $routeModel->getFeaturedRoutes();
    } elseif ($filter === 'popular') {
        $routes = $routeModel->getPopularRoutes();
    } elseif ($filter === 'international') {
        $routes = $routeModel->getInternationalRoutes();
    } else {
        $routes = $routeModel->getActiveRoutes();
    }

    Response::success($routes);
}

function handleGetRoute(array $params): void {
    global $db;
    $routeModel = new RouteModel($db);

    $route = $routeModel->getRouteWithSchedules((int)$params['id']);
    if (!$route) {
        Response::notFound('Rota bulunamadı');
    }

    // Get reviews
    $reviewModel = new ReviewModel($db);
    $route['rating'] = $reviewModel->getAverageRating((int)$params['id']);

    Response::success($route);
}

function handleSearchRoutes(array $params): void {
    global $db;
    $routeModel = new RouteModel($db);

    $departure = Request::query('departure', '');
    $arrival = Request::query('arrival', '');
    $date = Request::query('date');

    $routes = $routeModel->searchRoutes($departure, $arrival);

    // If date provided, include available schedules
    if ($date) {
        $scheduleModel = new ScheduleModel($db);
        foreach ($routes as &$route) {
            $route['available_schedules'] = $scheduleModel->searchAvailable($route['id'], $date);
        }
    }

    Response::success($routes);
}

function handleCreateRoute(array $params): void {
    $data = Request::validate([
        'departure_port' => 'required',
        'arrival_port' => 'required',
        'duration' => 'required|integer',
        'base_price' => 'required|numeric',
    ]);

    $body = Request::body();
    $routeData = array_merge($data, [
        'description' => $body['description'] ?? null,
        'distance' => $body['distance'] ?? null,
        'is_active' => $body['is_active'] ?? true,
        'is_featured' => $body['is_featured'] ?? false,
        'is_popular' => $body['is_popular'] ?? false,
        'is_international' => $body['is_international'] ?? false,
        'route_type' => $body['route_type'] ?? 'regular',
        'country_departure' => $body['country_departure'] ?? null,
        'country_arrival' => $body['country_arrival'] ?? null,
        'latitude_departure' => $body['latitude_departure'] ?? null,
        'longitude_departure' => $body['longitude_departure'] ?? null,
        'latitude_arrival' => $body['latitude_arrival'] ?? null,
        'longitude_arrival' => $body['longitude_arrival'] ?? null,
    ]);

    global $db;
    $routeModel = new RouteModel($db);
    $route = $routeModel->create($routeData);

    Response::success($route, 'Rota oluşturuldu', 201);
}

function handleUpdateRoute(array $params): void {
    global $db;
    $routeModel = new RouteModel($db);

    $existing = $routeModel->findById((int)$params['id']);
    if (!$existing) {
        Response::notFound('Rota bulunamadı');
    }

    $body = Request::body();
    $route = $routeModel->update((int)$params['id'], $body);

    Response::success($route, 'Rota güncellendi');
}

function handleDeleteRoute(array $params): void {
    global $db;
    $routeModel = new RouteModel($db);

    $existing = $routeModel->findById((int)$params['id']);
    if (!$existing) {
        Response::notFound('Rota bulunamadı');
    }

    $routeModel->delete((int)$params['id']);
    Response::success(null, 'Rota silindi');
}
