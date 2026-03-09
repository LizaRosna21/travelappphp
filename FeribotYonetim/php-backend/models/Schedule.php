<?php

class ScheduleModel extends BaseModel {
    protected string $table = 'schedules';

    public function getByRoute(int $routeId): array {
        return $this->query(
            "SELECT s.*, r.departure_port, r.arrival_port, r.base_price
             FROM schedules s
             JOIN routes r ON s.route_id = r.id
             WHERE s.route_id = :route_id AND s.is_active = true
             ORDER BY s.departure_time",
            [':route_id' => $routeId]
        );
    }

    public function searchAvailable(int $routeId, string $date): array {
        $dayOfWeek = date('w', strtotime($date)); // 0=Sunday

        return $this->query(
            "SELECT s.*, r.departure_port, r.arrival_port, r.base_price, r.duration
             FROM schedules s
             JOIN routes r ON s.route_id = r.id
             WHERE s.route_id = :route_id
               AND s.is_active = true
               AND s.is_cancelled = false
               AND s.start_date <= :date
               AND s.end_date >= :date
               AND s.days_of_week LIKE :day
             ORDER BY s.departure_time",
            [
                ':route_id' => $routeId,
                ':date' => $date,
                ':day' => "%$dayOfWeek%",
            ]
        );
    }

    public function getAvailableCapacity(int $scheduleId, string $date): array {
        $schedule = $this->findById($scheduleId);
        if (!$schedule) return ['available' => 0, 'total' => 0];

        $booked = $this->queryOne(
            "SELECT COUNT(*) as booked_count
             FROM bookings
             WHERE schedule_id = :schedule_id
               AND departure_date = :date
               AND status != 'cancelled'",
            [':schedule_id' => $scheduleId, ':date' => $date]
        );

        $total = $schedule['capacity'];
        $used = (int)($booked['booked_count'] ?? 0);

        return [
            'total' => $total,
            'booked' => $used,
            'available' => $total - $used,
            'passenger_capacity' => $schedule['passenger_capacity'],
            'vehicle_capacity' => $schedule['vehicle_capacity'],
        ];
    }

    public function getTodaySchedules(): array {
        $today = date('Y-m-d');
        $dayOfWeek = date('w');

        return $this->query(
            "SELECT s.*, r.departure_port, r.arrival_port
             FROM schedules s
             JOIN routes r ON s.route_id = r.id
             WHERE s.is_active = true
               AND s.is_cancelled = false
               AND s.start_date <= :today
               AND s.end_date >= :today
               AND s.days_of_week LIKE :day
             ORDER BY s.departure_time",
            [':today' => $today, ':day' => "%$dayOfWeek%"]
        );
    }
}
