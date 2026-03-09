<?php
/**
 * E-posta Gönderme Servisi
 * SendGrid API veya PHP mail() ile e-posta gönderir
 */

class EmailService {
    private ?string $sendgridApiKey;
    private string $fromEmail;
    private string $fromName;

    public function __construct() {
        $this->sendgridApiKey = getenv('SENDGRID_API_KEY') ?: null;
        $this->fromEmail = getenv('SENDGRID_FROM_EMAIL') ?: 'noreply@feribot.com';
        $this->fromName = getenv('SENDGRID_FROM_NAME') ?: 'Feribot Yönetim';
    }

    /**
     * E-posta gönder
     */
    public function send(string $to, string $subject, string $htmlContent, ?string $textContent = null): bool {
        if ($this->sendgridApiKey) {
            return $this->sendViaSendGrid($to, $subject, $htmlContent, $textContent);
        }

        return $this->sendViaPhpMail($to, $subject, $htmlContent);
    }

    /**
     * Rezervasyon onay e-postası gönder
     */
    public function sendBookingConfirmation(array $booking): bool {
        $email = $booking['guest_email'] ?? null;
        if (!$email && isset($booking['user_id'])) {
            // Kullanıcı e-postasını getir (db erişimi gerekir)
            return false;
        }

        if (!$email) return false;

        $subject = "Rezervasyon Onayı - PNR: {$booking['pnr_number']}";
        $route = $booking['route'] ?? [];

        $html = <<<HTML
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
            <div style="background: #0C4B7D; color: white; padding: 20px; text-align: center;">
                <h2>Rezervasyonunuz Onaylandı</h2>
            </div>
            <div style="padding: 20px;">
                <h3>PNR: {$booking['pnr_number']}</h3>
                <p><strong>Rota:</strong> {$route['departure_port']} → {$route['arrival_port']}</p>
                <p><strong>Tarih:</strong> {$booking['departure_date']}</p>
                <p><strong>Tutar:</strong> {$booking['total_price']} {$booking['currency']}</p>
                <p><strong>Durum:</strong> Onaylandı</p>
                <hr>
                <p style="color: #666; font-size: 12px;">Bu e-posta otomatik olarak gönderilmiştir.</p>
            </div>
        </div>
        HTML;

        return $this->send($email, $subject, $html);
    }

    private function sendViaSendGrid(string $to, string $subject, string $htmlContent, ?string $textContent): bool {
        $data = [
            'personalizations' => [['to' => [['email' => $to]]]],
            'from' => ['email' => $this->fromEmail, 'name' => $this->fromName],
            'subject' => $subject,
            'content' => [
                ['type' => 'text/html', 'value' => $htmlContent],
            ],
        ];

        if ($textContent) {
            array_unshift($data['content'], ['type' => 'text/plain', 'value' => $textContent]);
        }

        $ch = curl_init('https://api.sendgrid.com/v3/mail/send');
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($data),
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $this->sendgridApiKey,
                'Content-Type: application/json',
            ],
            CURLOPT_RETURNTRANSFER => true,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        return $httpCode >= 200 && $httpCode < 300;
    }

    private function sendViaPhpMail(string $to, string $subject, string $htmlContent): bool {
        $headers = [
            'MIME-Version: 1.0',
            'Content-type: text/html; charset=UTF-8',
            "From: {$this->fromName} <{$this->fromEmail}>",
        ];

        return mail($to, $subject, $htmlContent, implode("\r\n", $headers));
    }
}
