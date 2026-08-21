<?php
/**
 * Dinamik Fiyatlandırma Servisi
 * Doluluk oranı, mevsim ve özel etkinliklere göre fiyat hesaplar
 */

class PricingService {
    private PDO $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    /**
     * Bir rota+tarih+sefer için dinamik fiyat hesapla
     */
    public function calculatePrice(int $routeId, int $scheduleId, string $date, int $passengerTypeId = 1): array {
        // Temel fiyatı al
        $stmt = $this->db->prepare("SELECT base_price FROM routes WHERE id = :id");
        $stmt->execute([':id' => $routeId]);
        $route = $stmt->fetch();

        if (!$route) {
            throw new Exception('Rota bulunamadı');
        }

        $basePrice = (float)$route['base_price'];

        // Yolcu tipi çarpanı
        $stmt = $this->db->prepare("SELECT price_multiplier FROM passenger_types WHERE id = :id");
        $stmt->execute([':id' => $passengerTypeId]);
        $pType = $stmt->fetch();
        $multiplier = $pType ? (float)$pType['price_multiplier'] : 1.0;

        // Sefer indirimi
        $stmt = $this->db->prepare("SELECT discounted_price, has_promotion FROM schedules WHERE id = :id");
        $stmt->execute([':id' => $scheduleId]);
        $schedule = $stmt->fetch();

        $schedulePrice = ($schedule && $schedule['has_promotion'] && $schedule['discounted_price'])
            ? (float)$schedule['discounted_price']
            : $basePrice;

        // Doluluk bazlı fiyatlandırma
        $occupancyFactor = $this->getOccupancyFactor($scheduleId, $date);

        // Mevsimsel fiyatlandırma
        $seasonalFactor = $this->getSeasonalFactor($routeId, $date);

        // Dinamik fiyatlandırma kuralları
        $dynamicFactor = $this->getDynamicPricingFactor($routeId, $date);

        // Hesaplama
        $finalPrice = $schedulePrice * $multiplier * $occupancyFactor * $seasonalFactor * $dynamicFactor;
        $finalPrice = round($finalPrice, 2);

        return [
            'base_price' => $basePrice,
            'schedule_price' => $schedulePrice,
            'passenger_multiplier' => $multiplier,
            'occupancy_factor' => $occupancyFactor,
            'seasonal_factor' => $seasonalFactor,
            'dynamic_factor' => $dynamicFactor,
            'final_price' => $finalPrice,
            'currency' => 'TRY',
        ];
    }

    private function getOccupancyFactor(int $scheduleId, string $date): float {
        $stmt = $this->db->prepare(
            "SELECT s.capacity, COUNT(b.id) as booked
             FROM schedules s
             LEFT JOIN bookings b ON b.schedule_id = s.id AND b.departure_date = :date AND b.status != 'cancelled'
             WHERE s.id = :sid
             GROUP BY s.capacity"
        );
        $stmt->execute([':sid' => $scheduleId, ':date' => $date]);
        $result = $stmt->fetch();

        if (!$result || $result['capacity'] == 0) return 1.0;

        $occupancy = $result['booked'] / $result['capacity'];

        // Doluluk bazlı fiyat artışı
        if ($occupancy > 0.9) return 1.25;      // %90+ dolu: +25%
        if ($occupancy > 0.75) return 1.15;      // %75-90: +15%
        if ($occupancy > 0.5) return 1.05;       // %50-75: +5%
        if ($occupancy < 0.2) return 0.90;       // %20 altı: -10% (indirim)

        return 1.0;
    }

    private function getSeasonalFactor(int $routeId, string $date): float {
        $stmt = $this->db->prepare(
            "SELECT factor FROM seasonal_pricing_factors
             WHERE (route_id = :route_id OR route_id IS NULL)
               AND is_active = true
               AND start_date <= :date
               AND end_date >= :date
             ORDER BY route_id DESC NULLS LAST
             LIMIT 1"
        );
        $stmt->execute([':route_id' => $routeId, ':date' => $date]);
        $result = $stmt->fetch();

        return $result ? (float)$result['factor'] : 1.0;
    }

    private function getDynamicPricingFactor(int $routeId, string $date): float {
        $stmt = $this->db->prepare(
            "SELECT price_adjustment_type, price_adjustment_value
             FROM dynamic_pricing_rules
             WHERE (route_id = :route_id OR route_id IS NULL)
               AND is_active = true
               AND start_date <= :date
               AND end_date >= :date
             ORDER BY priority DESC
             LIMIT 1"
        );
        $stmt->execute([':route_id' => $routeId, ':date' => $date]);
        $result = $stmt->fetch();

        if (!$result) return 1.0;

        if ($result['price_adjustment_type'] === 'percentage') {
            return 1 + ((float)$result['price_adjustment_value'] / 100);
        }

        // Fixed amount - döndürülen değer direkt eklenir, burada çarpan olarak döndürüyoruz
        return 1.0;
    }
}
