<?php

class AgencyModel extends BaseModel {
    protected string $table = 'agencies';

    public function getActiveAgencies(): array {
        return $this->query(
            "SELECT a.*, u.username, u.email as user_email
             FROM agencies a
             LEFT JOIN users u ON a.user_id = u.id
             WHERE a.is_active = true
             ORDER BY a.name"
        );
    }

    public function getAgencyWithDetails(int $agencyId): ?array {
        $agency = $this->findById($agencyId);
        if (!$agency) return null;

        $agency['commission_tiers'] = $this->query(
            "SELECT * FROM agency_commission_tiers WHERE agency_id = :id ORDER BY min_sales_amount",
            [':id' => $agencyId]
        );

        $agency['recent_bookings'] = $this->query(
            "SELECT ab.*, b.booking_reference, b.total_price, b.status, b.departure_date
             FROM agency_bookings ab
             JOIN bookings b ON ab.booking_id = b.id
             WHERE ab.agency_id = :id
             ORDER BY ab.created_at DESC LIMIT 10",
            [':id' => $agencyId]
        );

        $agency['stats'] = $this->queryOne(
            "SELECT
                COUNT(*) as total_bookings,
                COALESCE(SUM(commission_amount::numeric), 0) as total_commission,
                COUNT(*) FILTER (WHERE status = 'approved') as approved_bookings
             FROM agency_bookings WHERE agency_id = :id",
            [':id' => $agencyId]
        );

        return $agency;
    }

    public function getAgencyPayments(int $agencyId): array {
        return $this->query(
            "SELECT * FROM agency_payments WHERE agency_id = :id ORDER BY created_at DESC",
            [':id' => $agencyId]
        );
    }

    public function addCommissionTier(array $data): array {
        $sql = "INSERT INTO agency_commission_tiers (agency_id, commission_rate, min_sales_amount, max_sales_amount, description, is_active, created_at, updated_at)
                VALUES (:agency_id, :commission_rate, :min_sales_amount, :max_sales_amount, :description, :is_active, NOW(), NOW())
                RETURNING *";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':agency_id' => $data['agency_id'],
            ':commission_rate' => $data['commission_rate'],
            ':min_sales_amount' => $data['min_sales_amount'],
            ':max_sales_amount' => $data['max_sales_amount'] ?? null,
            ':description' => $data['description'] ?? null,
            ':is_active' => $data['is_active'] ?? true,
        ]);
        return $stmt->fetch();
    }
}
