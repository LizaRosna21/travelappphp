<?php
/**
 * Bilet oluşturma servisi
 * PDF bilet oluşturmak için TCPDF veya FPDF kullanılabilir
 */

class TicketService {
    private PDO $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    /**
     * HTML formatında bilet oluşturur (PDF kütüphanesi olmadan da çalışır)
     */
    public function generateTicketHTML(int $bookingId): string {
        $bookingModel = new BookingModel($this->db);
        $booking = $bookingModel->getDetailedBooking($bookingId);

        if (!$booking) {
            throw new Exception('Rezervasyon bulunamadı');
        }

        $route = $booking['route'];
        $passengers = $booking['passengers'] ?? [];

        $passengerRows = '';
        foreach ($passengers as $p) {
            $passengerRows .= "<tr>
                <td>{$p['first_name']} {$p['last_name']}</td>
                <td>{$p['passenger_type_name']}</td>
                <td>{$p['document_number']}</td>
            </tr>";
        }

        return <<<HTML
        <!DOCTYPE html>
        <html lang="tr">
        <head>
            <meta charset="UTF-8">
            <title>Feribot Bileti - {$booking['pnr_number']}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .ticket { border: 2px solid #0C4B7D; border-radius: 10px; padding: 20px; max-width: 600px; margin: auto; }
                .header { background: #0C4B7D; color: white; padding: 15px; border-radius: 8px 8px 0 0; margin: -20px -20px 20px; text-align: center; }
                .info-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee; }
                .label { font-weight: bold; color: #666; }
                .value { color: #333; }
                .route { font-size: 24px; text-align: center; margin: 20px 0; color: #0C4B7D; }
                .pnr { font-size: 28px; font-weight: bold; text-align: center; letter-spacing: 4px; color: #0C4B7D; }
                table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                th, td { padding: 8px; text-align: left; border: 1px solid #ddd; }
                th { background: #f5f5f5; }
                .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #999; }
            </style>
        </head>
        <body>
            <div class="ticket">
                <div class="header">
                    <h2>FERIBOT BİLETİ</h2>
                </div>

                <div class="pnr">PNR: {$booking['pnr_number']}</div>

                <div class="route">
                    {$route['departure_port']} → {$route['arrival_port']}
                </div>

                <div class="info-row">
                    <span class="label">Kalkış Tarihi:</span>
                    <span class="value">{$booking['departure_date']}</span>
                </div>
                <div class="info-row">
                    <span class="label">Toplam Tutar:</span>
                    <span class="value">{$booking['total_price']} {$booking['currency']}</span>
                </div>
                <div class="info-row">
                    <span class="label">Durum:</span>
                    <span class="value">{$booking['status']}</span>
                </div>
                <div class="info-row">
                    <span class="label">Referans:</span>
                    <span class="value">{$booking['booking_reference']}</span>
                </div>

                <h3>Yolcular</h3>
                <table>
                    <thead>
                        <tr><th>Ad Soyad</th><th>Tip</th><th>Belge No</th></tr>
                    </thead>
                    <tbody>
                        {$passengerRows}
                    </tbody>
                </table>

                <div class="footer">
                    <p>Bu bilet elektronik olarak üretilmiştir.</p>
                    <p>Feribot Yönetim Sistemi &copy; 2026</p>
                </div>
            </div>
        </body>
        </html>
        HTML;
    }
}
