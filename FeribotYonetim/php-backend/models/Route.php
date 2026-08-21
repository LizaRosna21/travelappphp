<?php

class RouteModel extends BaseModel {
    protected string $table = 'routes';

    public function getActiveRoutes(): array {
        return $this->query(
            "SELECT * FROM routes WHERE is_active = true ORDER BY departure_port, arrival_port"
        );
    }

    public function getFeaturedRoutes(): array {
        return $this->query(
            "SELECT * FROM routes WHERE is_active = true AND is_featured = true ORDER BY id"
        );
    }

    public function getPopularRoutes(): array {
        return $this->query(
            "SELECT * FROM routes WHERE is_active = true AND is_popular = true ORDER BY id"
        );
    }

    public function searchRoutes(string $departure, string $arrival): array {
        return $this->query(
            "SELECT * FROM routes
             WHERE is_active = true
               AND departure_port ILIKE :departure
               AND arrival_port ILIKE :arrival
             ORDER BY base_price ASC",
            [':departure' => "%$departure%", ':arrival' => "%$arrival%"]
        );
    }

    public function getRouteWithSchedules(int $routeId): ?array {
        $route = $this->findById($routeId);
        if (!$route) return null;

        $schedules = $this->query(
            "SELECT * FROM schedules WHERE route_id = :route_id AND is_active = true ORDER BY departure_time",
            [':route_id' => $routeId]
        );

        $route['schedules'] = $schedules;
        return $route;
    }

    public function getInternationalRoutes(): array {
        return $this->query(
            "SELECT * FROM routes WHERE is_active = true AND is_international = true ORDER BY departure_port"
        );
    }

    public function getRouteStats(): array {
        return $this->queryOne(
            "SELECT
                COUNT(*) as total_routes,
                COUNT(*) FILTER (WHERE is_active = true) as active_routes,
                COUNT(*) FILTER (WHERE is_international = true) as international_routes,
                COUNT(*) FILTER (WHERE is_featured = true) as featured_routes,
                AVG(base_price::numeric) as avg_base_price
             FROM routes"
        );
    }
}
