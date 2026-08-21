<?php

class ReviewModel extends BaseModel {
    protected string $table = 'reviews';

    public function getByRoute(int $routeId): array {
        return $this->query(
            "SELECT rv.*, u.username, u.full_name, u.profile_image
             FROM reviews rv
             LEFT JOIN users u ON rv.user_id = u.id
             WHERE rv.route_id = :route_id
             ORDER BY rv.created_at DESC",
            [':route_id' => $routeId]
        );
    }

    public function getAverageRating(int $routeId): ?array {
        return $this->queryOne(
            "SELECT AVG(rating) as avg_rating, COUNT(*) as review_count
             FROM reviews WHERE route_id = :route_id",
            [':route_id' => $routeId]
        );
    }
}
