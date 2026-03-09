<?php

class CampaignModel extends BaseModel {
    protected string $table = 'campaigns';

    public function getActiveCampaigns(): array {
        return $this->query(
            "SELECT * FROM campaigns WHERE is_active = true AND end_date >= :today ORDER BY start_date",
            [':today' => date('Y-m-d')]
        );
    }

    public function validateCoupon(string $code, ?int $routeId = null): ?array {
        $campaign = $this->findOne(['code' => strtoupper($code), 'is_active' => true]);
        if (!$campaign) return null;

        // Check dates
        $today = date('Y-m-d');
        if ($today < $campaign['start_date'] || $today > $campaign['end_date']) return null;

        // Check usage limit
        if ($campaign['total_usage_limit'] && $campaign['current_usage'] >= $campaign['total_usage_limit']) return null;

        // Check route applicability
        if ($campaign['applies_to'] === 'select_routes' && $routeId) {
            $applicableRoutes = explode(',', $campaign['applicable_route_ids'] ?? '');
            if (!in_array((string)$routeId, $applicableRoutes)) return null;
        }

        return $campaign;
    }

    public function incrementUsage(int $campaignId): void {
        $this->execute(
            "UPDATE campaigns SET current_usage = current_usage + 1, updated_at = NOW() WHERE id = :id",
            [':id' => $campaignId]
        );
    }
}
