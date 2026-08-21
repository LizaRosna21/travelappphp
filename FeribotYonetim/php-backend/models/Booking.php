<?php

class BookingModel extends BaseModel {
    protected string $table = 'bookings';

    public function createBooking(array $data): array {
        $data['booking_reference'] = $this->generateBookingReference();
        $data['pnr_number'] = $this->generatePNR();
        $data['created_at'] = date('Y-m-d H:i:s');
        $data['updated_at'] = date('Y-m-d H:i:s');
        $data['status'] = $data['status'] ?? 'pending';
        $data['is_paid'] = $data['is_paid'] ?? false;
        $data['currency'] = $data['currency'] ?? 'try';

        return $this->create($data);
    }

    public function getByUser(int $userId): array {
        return $this->query(
            "SELECT b.*, r.departure_port, r.arrival_port, s.departure_time, s.arrival_time
             FROM bookings b
             JOIN routes r ON b.route_id = r.id
             JOIN schedules s ON b.schedule_id = s.id
             WHERE b.user_id = :user_id
             ORDER BY b.created_at DESC",
            [':user_id' => $userId]
        );
    }

    public function getByPNR(string $pnr): ?array {
        $booking = $this->findOne(['pnr_number' => $pnr]);
        if (!$booking) return null;

        $booking['passengers'] = $this->query(
            "SELECT bp.*, pt.name as passenger_type_name, pt.price_multiplier
             FROM booking_passengers bp
             JOIN passenger_types pt ON bp.passenger_type_id = pt.id
             WHERE bp.booking_id = :booking_id",
            [':booking_id' => $booking['id']]
        );

        $booking['vehicles'] = $this->query(
            "SELECT bv.*, vt.name as vehicle_type_name, vt.additional_price
             FROM booking_vehicles bv
             JOIN vehicle_types vt ON bv.vehicle_type_id = vt.id
             WHERE bv.booking_id = :booking_id",
            [':booking_id' => $booking['id']]
        );

        $booking['route'] = $this->queryOne(
            "SELECT * FROM routes WHERE id = :id",
            [':id' => $booking['route_id']]
        );

        $booking['schedule'] = $this->queryOne(
            "SELECT * FROM schedules WHERE id = :id",
            [':id' => $booking['schedule_id']]
        );

        return $booking;
    }

    public function getDetailedBooking(int $bookingId): ?array {
        $booking = $this->findById($bookingId);
        if (!$booking) return null;
        return $this->getByPNR($booking['pnr_number']);
    }

    public function addPassenger(array $data): array {
        $sql = "INSERT INTO booking_passengers (booking_id, passenger_type_id, first_name, last_name, document_number, birth_date, contact)
                VALUES (:booking_id, :passenger_type_id, :first_name, :last_name, :document_number, :birth_date, :contact)
                RETURNING *";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':booking_id' => $data['booking_id'],
            ':passenger_type_id' => $data['passenger_type_id'],
            ':first_name' => $data['first_name'],
            ':last_name' => $data['last_name'],
            ':document_number' => $data['document_number'] ?? null,
            ':birth_date' => $data['birth_date'] ?? null,
            ':contact' => $data['contact'] ?? null,
        ]);
        return $stmt->fetch();
    }

    public function addVehicle(array $data): array {
        $sql = "INSERT INTO booking_vehicles (booking_id, vehicle_type_id, license_plate)
                VALUES (:booking_id, :vehicle_type_id, :license_plate)
                RETURNING *";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':booking_id' => $data['booking_id'],
            ':vehicle_type_id' => $data['vehicle_type_id'],
            ':license_plate' => $data['license_plate'] ?? null,
        ]);
        return $stmt->fetch();
    }

    public function updateStatus(int $bookingId, string $status): ?array {
        return $this->update($bookingId, [
            'status' => $status,
            'updated_at' => date('Y-m-d H:i:s'),
        ]);
    }

    public function confirmPayment(int $bookingId, string $paymentMethod, ?string $paymentIntentId = null): ?array {
        return $this->update($bookingId, [
            'is_paid' => true,
            'status' => 'confirmed',
            'payment_method' => $paymentMethod,
            'payment_intent_id' => $paymentIntentId,
            'updated_at' => date('Y-m-d H:i:s'),
        ]);
    }

    public function cancelBooking(int $bookingId, ?string $reason = null): ?array {
        return $this->update($bookingId, [
            'status' => 'cancelled',
            'refund_reason' => $reason,
            'updated_at' => date('Y-m-d H:i:s'),
        ]);
    }

    public function getBookingStats(): array {
        return $this->queryOne(
            "SELECT
                COUNT(*) as total_bookings,
                COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
                COUNT(*) FILTER (WHERE status = 'pending') as pending,
                COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
                COUNT(*) FILTER (WHERE is_paid = true) as paid,
                COALESCE(SUM(total_price::numeric) FILTER (WHERE status = 'confirmed'), 0) as total_revenue,
                COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as last_24h,
                COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as last_7_days,
                COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as last_30_days
             FROM bookings"
        );
    }

    public function getRecentBookings(int $limit = 10): array {
        return $this->query(
            "SELECT b.*, r.departure_port, r.arrival_port, u.username, u.email
             FROM bookings b
             JOIN routes r ON b.route_id = r.id
             LEFT JOIN users u ON b.user_id = u.id
             ORDER BY b.created_at DESC
             LIMIT :limit",
            [':limit' => $limit]
        );
    }

    public function getRevenueByRoute(): array {
        return $this->query(
            "SELECT r.id, r.departure_port, r.arrival_port,
                    COUNT(b.id) as booking_count,
                    COALESCE(SUM(b.total_price::numeric), 0) as total_revenue
             FROM routes r
             LEFT JOIN bookings b ON r.id = b.route_id AND b.status = 'confirmed'
             WHERE r.is_active = true
             GROUP BY r.id, r.departure_port, r.arrival_port
             ORDER BY total_revenue DESC"
        );
    }

    public function getDailyRevenue(int $days = 30): array {
        return $this->query(
            "SELECT DATE(created_at) as date,
                    COUNT(*) as bookings,
                    COALESCE(SUM(total_price::numeric), 0) as revenue
             FROM bookings
             WHERE status = 'confirmed'
               AND created_at >= NOW() - INTERVAL ':days days'
             GROUP BY DATE(created_at)
             ORDER BY date DESC",
            [':days' => $days]
        );
    }

    private function generateBookingReference(): string {
        return 'FB-' . strtoupper(substr(uniqid(), -8)) . '-' . date('ymd');
    }

    private function generatePNR(): string {
        $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        $pnr = '';
        for ($i = 0; $i < 6; $i++) {
            $pnr .= $chars[random_int(0, strlen($chars) - 1)];
        }
        // Ensure uniqueness
        $existing = $this->findOne(['pnr_number' => $pnr]);
        return $existing ? $this->generatePNR() : $pnr;
    }
}
