<?php
/**
 * Başlangıç verileri (Seed Data)
 * Kullanım: php migrations/002_seed_data.php
 */

require_once __DIR__ . '/../config/app.php';
require_once __DIR__ . '/../config/database.php';

$database = new Database();
$db = $database->getConnection();

echo "=== FERİBOT YÖNETİM - Seed Data ===\n\n";

// ========== ADMIN KULLANICI ==========
echo "Admin kullanıcı oluşturuluyor...\n";
try {
    $stmt = $db->prepare("SELECT id FROM users WHERE username = 'admin'");
    $stmt->execute();
    if (!$stmt->fetch()) {
        $stmt = $db->prepare(
            "INSERT INTO users (username, password, email, full_name, role, is_active)
             VALUES (:username, :password, :email, :full_name, :role, true)"
        );
        $stmt->execute([
            ':username' => 'admin',
            ':password' => password_hash('admin123', PASSWORD_BCRYPT, ['cost' => 10]),
            ':email' => 'admin@feribot.com',
            ':full_name' => 'Sistem Yöneticisi',
            ':role' => 'superadmin',
        ]);
        echo "[OK] Admin kullanıcı oluşturuldu (admin / admin123)\n";
    } else {
        echo "[ATLANDI] Admin zaten mevcut\n";
    }
} catch (PDOException $e) {
    echo "[HATA] " . $e->getMessage() . "\n";
}

// ========== YOLCU TİPLERİ ==========
echo "\nYolcu tipleri oluşturuluyor...\n";
$passengerTypes = [
    ['name' => 'Yetişkin', 'price_multiplier' => '1.0', 'description' => '12 yaş ve üzeri'],
    ['name' => 'Çocuk', 'price_multiplier' => '0.5', 'description' => '2-12 yaş arası'],
    ['name' => 'Bebek', 'price_multiplier' => '0.0', 'description' => '0-2 yaş arası'],
    ['name' => 'Öğrenci', 'price_multiplier' => '0.7', 'description' => 'Geçerli öğrenci belgesi ile'],
    ['name' => 'Yaşlı', 'price_multiplier' => '0.8', 'description' => '65 yaş ve üzeri'],
];

foreach ($passengerTypes as $pt) {
    try {
        $stmt = $db->prepare("SELECT id FROM passenger_types WHERE name = :name");
        $stmt->execute([':name' => $pt['name']]);
        if (!$stmt->fetch()) {
            $stmt = $db->prepare("INSERT INTO passenger_types (name, price_multiplier, description) VALUES (:name, :pm, :desc)");
            $stmt->execute([':name' => $pt['name'], ':pm' => $pt['price_multiplier'], ':desc' => $pt['description']]);
            echo "[OK] {$pt['name']}\n";
        }
    } catch (PDOException $e) {
        echo "[HATA] {$pt['name']}: " . $e->getMessage() . "\n";
    }
}

// ========== ARAÇ TİPLERİ ==========
echo "\nAraç tipleri oluşturuluyor...\n";
$vehicleTypes = [
    ['name' => 'Otomobil', 'additional_price' => '150.00'],
    ['name' => 'Minibüs', 'additional_price' => '300.00'],
    ['name' => 'Motosiklet', 'additional_price' => '75.00'],
    ['name' => 'Bisiklet', 'additional_price' => '25.00'],
    ['name' => 'Kamyonet', 'additional_price' => '400.00'],
    ['name' => 'Karavan', 'additional_price' => '500.00'],
];

foreach ($vehicleTypes as $vt) {
    try {
        $stmt = $db->prepare("SELECT id FROM vehicle_types WHERE name = :name");
        $stmt->execute([':name' => $vt['name']]);
        if (!$stmt->fetch()) {
            $stmt = $db->prepare("INSERT INTO vehicle_types (name, additional_price) VALUES (:name, :price)");
            $stmt->execute([':name' => $vt['name'], ':price' => $vt['additional_price']]);
            echo "[OK] {$vt['name']}\n";
        }
    } catch (PDOException $e) {
        echo "[HATA] {$vt['name']}: " . $e->getMessage() . "\n";
    }
}

// ========== ROTALAR ==========
echo "\nFeribot rotaları oluşturuluyor...\n";
$routes = [
    ['departure_port' => 'Bodrum', 'arrival_port' => 'Kos', 'duration' => 60, 'base_price' => '250.00', 'is_international' => true, 'country_departure' => 'TR', 'country_arrival' => 'GR', 'is_featured' => true, 'is_popular' => true],
    ['departure_port' => 'Çeşme', 'arrival_port' => 'Chios', 'duration' => 45, 'base_price' => '200.00', 'is_international' => true, 'country_departure' => 'TR', 'country_arrival' => 'GR', 'is_featured' => true],
    ['departure_port' => 'Kuşadası', 'arrival_port' => 'Samos', 'duration' => 90, 'base_price' => '300.00', 'is_international' => true, 'country_departure' => 'TR', 'country_arrival' => 'GR', 'is_popular' => true],
    ['departure_port' => 'Fethiye', 'arrival_port' => 'Rodos', 'duration' => 120, 'base_price' => '450.00', 'is_international' => true, 'country_departure' => 'TR', 'country_arrival' => 'GR'],
    ['departure_port' => 'Marmaris', 'arrival_port' => 'Rodos', 'duration' => 50, 'base_price' => '350.00', 'is_international' => true, 'country_departure' => 'TR', 'country_arrival' => 'GR', 'is_featured' => true, 'is_popular' => true],
    ['departure_port' => 'Ayvalık', 'arrival_port' => 'Midilli', 'duration' => 90, 'base_price' => '220.00', 'is_international' => true, 'country_departure' => 'TR', 'country_arrival' => 'GR'],
    ['departure_port' => 'Kaş', 'arrival_port' => 'Meis', 'duration' => 20, 'base_price' => '180.00', 'is_international' => true, 'country_departure' => 'TR', 'country_arrival' => 'GR', 'is_popular' => true],
    ['departure_port' => 'İstanbul (Yenikapı)', 'arrival_port' => 'Bandırma', 'duration' => 135, 'base_price' => '120.00', 'is_international' => false, 'country_departure' => 'TR', 'country_arrival' => 'TR'],
    ['departure_port' => 'İstanbul (Yenikapı)', 'arrival_port' => 'Bursa (Güzelyalı)', 'duration' => 105, 'base_price' => '100.00', 'is_international' => false, 'country_departure' => 'TR', 'country_arrival' => 'TR'],
    ['departure_port' => 'Çanakkale', 'arrival_port' => 'Eceabat', 'duration' => 25, 'base_price' => '25.00', 'is_international' => false, 'country_departure' => 'TR', 'country_arrival' => 'TR'],
];

foreach ($routes as $route) {
    try {
        $stmt = $db->prepare("SELECT id FROM routes WHERE departure_port = :dp AND arrival_port = :ap");
        $stmt->execute([':dp' => $route['departure_port'], ':ap' => $route['arrival_port']]);
        if (!$stmt->fetch()) {
            $stmt = $db->prepare(
                "INSERT INTO routes (departure_port, arrival_port, duration, base_price, is_active, is_international, country_departure, country_arrival, is_featured, is_popular)
                 VALUES (:dp, :ap, :dur, :price, true, :intl, :cd, :ca, :feat, :pop)"
            );
            $stmt->execute([
                ':dp' => $route['departure_port'],
                ':ap' => $route['arrival_port'],
                ':dur' => $route['duration'],
                ':price' => $route['base_price'],
                ':intl' => $route['is_international'] ? 'true' : 'false',
                ':cd' => $route['country_departure'],
                ':ca' => $route['country_arrival'],
                ':feat' => ($route['is_featured'] ?? false) ? 'true' : 'false',
                ':pop' => ($route['is_popular'] ?? false) ? 'true' : 'false',
            ]);
            echo "[OK] {$route['departure_port']} → {$route['arrival_port']}\n";
        }
    } catch (PDOException $e) {
        echo "[HATA] {$route['departure_port']}: " . $e->getMessage() . "\n";
    }
}

// ========== DİLLER ==========
echo "\nDiller oluşturuluyor...\n";
$languages = [
    ['code' => 'tr', 'name' => 'Turkish', 'local_name' => 'Türkçe', 'flag_emoji' => '🇹🇷', 'is_default' => true],
    ['code' => 'en', 'name' => 'English', 'local_name' => 'English', 'flag_emoji' => '🇬🇧', 'is_default' => false],
    ['code' => 'de', 'name' => 'German', 'local_name' => 'Deutsch', 'flag_emoji' => '🇩🇪', 'is_default' => false],
    ['code' => 'ru', 'name' => 'Russian', 'local_name' => 'Русский', 'flag_emoji' => '🇷🇺', 'is_default' => false],
];

foreach ($languages as $lang) {
    try {
        $stmt = $db->prepare("SELECT id FROM languages WHERE code = :code");
        $stmt->execute([':code' => $lang['code']]);
        if (!$stmt->fetch()) {
            $stmt = $db->prepare(
                "INSERT INTO languages (code, name, local_name, flag_emoji, is_active, is_default)
                 VALUES (:code, :name, :local, :flag, true, :def)"
            );
            $stmt->execute([
                ':code' => $lang['code'],
                ':name' => $lang['name'],
                ':local' => $lang['local_name'],
                ':flag' => $lang['flag_emoji'],
                ':def' => $lang['is_default'] ? 'true' : 'false',
            ]);
            echo "[OK] {$lang['name']}\n";
        }
    } catch (PDOException $e) {
        echo "[HATA] {$lang['name']}: " . $e->getMessage() . "\n";
    }
}

// ========== PARA BİRİMLERİ ==========
echo "\nPara birimleri oluşturuluyor...\n";
$currencies = [
    ['code' => 'TRY', 'name' => 'Türk Lirası', 'symbol' => '₺', 'exchange_rate' => '1', 'is_default' => true],
    ['code' => 'EUR', 'name' => 'Euro', 'symbol' => '€', 'exchange_rate' => '0.028', 'is_default' => false],
    ['code' => 'USD', 'name' => 'ABD Doları', 'symbol' => '$', 'exchange_rate' => '0.031', 'is_default' => false],
    ['code' => 'GBP', 'name' => 'İngiliz Sterlini', 'symbol' => '£', 'exchange_rate' => '0.024', 'is_default' => false],
];

foreach ($currencies as $curr) {
    try {
        $stmt = $db->prepare("SELECT id FROM currencies WHERE code = :code");
        $stmt->execute([':code' => $curr['code']]);
        if (!$stmt->fetch()) {
            $stmt = $db->prepare(
                "INSERT INTO currencies (code, name, symbol, exchange_rate, is_active, is_default)
                 VALUES (:code, :name, :symbol, :rate, true, :def)"
            );
            $stmt->execute([
                ':code' => $curr['code'],
                ':name' => $curr['name'],
                ':symbol' => $curr['symbol'],
                ':rate' => $curr['exchange_rate'],
                ':def' => $curr['is_default'] ? 'true' : 'false',
            ]);
            echo "[OK] {$curr['name']}\n";
        }
    } catch (PDOException $e) {
        echo "[HATA] {$curr['name']}: " . $e->getMessage() . "\n";
    }
}

// ========== LİMANLAR ==========
echo "\nLimanlar oluşturuluyor...\n";
$ports = [
    ['name' => 'Bodrum Limanı', 'country' => 'Türkiye', 'city' => 'Muğla'],
    ['name' => 'Kos Limanı', 'country' => 'Yunanistan', 'city' => 'Kos'],
    ['name' => 'Çeşme Limanı', 'country' => 'Türkiye', 'city' => 'İzmir'],
    ['name' => 'Chios Limanı', 'country' => 'Yunanistan', 'city' => 'Chios'],
    ['name' => 'Kuşadası Limanı', 'country' => 'Türkiye', 'city' => 'Aydın'],
    ['name' => 'Samos Limanı', 'country' => 'Yunanistan', 'city' => 'Samos'],
    ['name' => 'Fethiye Limanı', 'country' => 'Türkiye', 'city' => 'Muğla'],
    ['name' => 'Marmaris Limanı', 'country' => 'Türkiye', 'city' => 'Muğla'],
    ['name' => 'Rodos Limanı', 'country' => 'Yunanistan', 'city' => 'Rodos'],
    ['name' => 'Kaş Limanı', 'country' => 'Türkiye', 'city' => 'Antalya'],
    ['name' => 'Meis Limanı', 'country' => 'Yunanistan', 'city' => 'Meis'],
    ['name' => 'Yenikapı İDO', 'country' => 'Türkiye', 'city' => 'İstanbul'],
    ['name' => 'Bandırma Limanı', 'country' => 'Türkiye', 'city' => 'Balıkesir'],
    ['name' => 'Çanakkale Limanı', 'country' => 'Türkiye', 'city' => 'Çanakkale'],
    ['name' => 'Eceabat Limanı', 'country' => 'Türkiye', 'city' => 'Çanakkale'],
    ['name' => 'Ayvalık Limanı', 'country' => 'Türkiye', 'city' => 'Balıkesir'],
    ['name' => 'Midilli Limanı', 'country' => 'Yunanistan', 'city' => 'Midilli'],
];

foreach ($ports as $port) {
    try {
        $stmt = $db->prepare("SELECT id FROM ports WHERE name = :name");
        $stmt->execute([':name' => $port['name']]);
        if (!$stmt->fetch()) {
            $stmt = $db->prepare("INSERT INTO ports (name, country, city, is_active) VALUES (:name, :country, :city, true)");
            $stmt->execute([':name' => $port['name'], ':country' => $port['country'], ':city' => $port['city']]);
            echo "[OK] {$port['name']}\n";
        }
    } catch (PDOException $e) {
        echo "[HATA] {$port['name']}: " . $e->getMessage() . "\n";
    }
}

// ========== SITE AYARLARI ==========
echo "\nSite ayarları oluşturuluyor...\n";
try {
    $stmt = $db->query("SELECT id FROM site_settings LIMIT 1");
    if (!$stmt->fetch()) {
        $db->exec(
            "INSERT INTO site_settings (site_name, contact_email, contact_phone)
             VALUES ('Feribot Yönetim', 'info@feribot.com', '+90 555 123 4567')"
        );
        echo "[OK] Site ayarları oluşturuldu\n";
    }
} catch (PDOException $e) {
    echo "[HATA] " . $e->getMessage() . "\n";
}

echo "\n=== Seed Data Tamamlandı ===\n";
