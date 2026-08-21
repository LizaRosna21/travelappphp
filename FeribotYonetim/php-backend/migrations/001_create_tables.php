<?php
/**
 * Veritabanı tabloları oluşturma migration'ı
 * Mevcut TypeScript şemasından PHP'ye aktarılmıştır
 *
 * Kullanım: php migrations/001_create_tables.php
 */

require_once __DIR__ . '/../config/app.php';
require_once __DIR__ . '/../config/database.php';

$database = new Database();
$db = $database->getConnection();

$tables = [
    // ========== USERS ==========
    "CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        full_name TEXT,
        role TEXT NOT NULL DEFAULT 'user',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        phone_number TEXT,
        last_login_at TIMESTAMP,
        profile_image TEXT,
        preferences JSONB DEFAULT '{}' NOT NULL,
        parent_agency_id INTEGER
    )",

    // ========== ROUTES ==========
    "CREATE TABLE IF NOT EXISTS routes (
        id SERIAL PRIMARY KEY,
        departure_port TEXT NOT NULL,
        arrival_port TEXT NOT NULL,
        distance INTEGER,
        duration INTEGER NOT NULL,
        base_price NUMERIC NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        check_in_start_time INTEGER,
        check_in_end_time INTEGER,
        boarding_start_time INTEGER,
        boarding_end_time INTEGER,
        special_instructions TEXT,
        latitude_departure TEXT,
        longitude_departure TEXT,
        latitude_arrival TEXT,
        longitude_arrival TEXT,
        is_featured BOOLEAN DEFAULT FALSE,
        is_popular BOOLEAN DEFAULT FALSE,
        travel_time TEXT,
        route_code TEXT,
        route_type TEXT DEFAULT 'regular',
        is_international BOOLEAN DEFAULT FALSE,
        country_departure TEXT,
        country_arrival TEXT
    )",

    // ========== SCHEDULES ==========
    "CREATE TABLE IF NOT EXISTS schedules (
        id SERIAL PRIMARY KEY,
        route_id INTEGER NOT NULL REFERENCES routes(id),
        departure_time TIME NOT NULL,
        arrival_time TIME NOT NULL,
        days_of_week TEXT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        capacity INTEGER NOT NULL,
        passenger_capacity INTEGER DEFAULT 0 NOT NULL,
        vehicle_capacity INTEGER DEFAULT 0 NOT NULL,
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        is_special_schedule BOOLEAN DEFAULT FALSE,
        special_dates JSONB,
        special_instructions TEXT,
        is_full BOOLEAN DEFAULT FALSE,
        is_popular BOOLEAN DEFAULT FALSE,
        fare_type TEXT DEFAULT 'standard',
        discounted_price NUMERIC,
        has_promotion BOOLEAN DEFAULT FALSE,
        promotion_description TEXT,
        is_cancelled BOOLEAN DEFAULT FALSE,
        cancellation_reason TEXT,
        ferry_id INTEGER,
        crew_details JSONB,
        weather_condition TEXT,
        checkin_location TEXT,
        boarding_location TEXT,
        bag_allowance JSONB,
        amenities JSONB
    )",

    // ========== FERRY COMPANIES ==========
    "CREATE TABLE IF NOT EXISTS ferry_companies (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        logo TEXT,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE NOT NULL
    )",

    // ========== VEHICLE TYPES ==========
    "CREATE TABLE IF NOT EXISTS vehicle_types (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        additional_price NUMERIC NOT NULL
    )",

    // ========== PASSENGER TYPES ==========
    "CREATE TABLE IF NOT EXISTS passenger_types (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        price_multiplier NUMERIC NOT NULL,
        description TEXT
    )",

    // ========== BOOKINGS ==========
    "CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        route_id INTEGER NOT NULL REFERENCES routes(id),
        schedule_id INTEGER NOT NULL REFERENCES schedules(id),
        departure_date DATE NOT NULL,
        return_date DATE,
        total_price NUMERIC NOT NULL,
        currency TEXT DEFAULT 'try' NOT NULL,
        status TEXT DEFAULT 'pending' NOT NULL,
        is_paid BOOLEAN DEFAULT FALSE NOT NULL,
        booking_reference TEXT NOT NULL,
        pnr_number TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        payment_intent_id TEXT,
        payment_method TEXT,
        refund_reason TEXT,
        refund_amount NUMERIC,
        refund_date TIMESTAMP,
        ticket_number TEXT,
        notes TEXT,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        guest_email TEXT,
        guest_name TEXT
    )",

    // ========== BOOKING PASSENGERS ==========
    "CREATE TABLE IF NOT EXISTS booking_passengers (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER NOT NULL REFERENCES bookings(id),
        passenger_type_id INTEGER NOT NULL REFERENCES passenger_types(id),
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        document_number TEXT,
        birth_date DATE,
        contact TEXT
    )",

    // ========== BOOKING VEHICLES ==========
    "CREATE TABLE IF NOT EXISTS booking_vehicles (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER NOT NULL REFERENCES bookings(id),
        vehicle_type_id INTEGER NOT NULL REFERENCES vehicle_types(id),
        license_plate TEXT
    )",

    // ========== SITE SETTINGS ==========
    "CREATE TABLE IF NOT EXISTS site_settings (
        id SERIAL PRIMARY KEY,
        site_name TEXT DEFAULT 'FerryBooking' NOT NULL,
        logo_url TEXT,
        favicon_url TEXT,
        primary_color TEXT DEFAULT '#0C4B7D' NOT NULL,
        secondary_color TEXT DEFAULT '#1A94FF' NOT NULL,
        accent_color TEXT DEFAULT '#FF7D00' NOT NULL,
        button_primary_color TEXT DEFAULT '#0C4B7D' NOT NULL,
        button_secondary_color TEXT DEFAULT '#1A94FF' NOT NULL,
        button_accent_color TEXT DEFAULT '#FF7D00' NOT NULL,
        card_tag_popular_color TEXT DEFAULT '#2563EB' NOT NULL,
        card_tag_fastest_color TEXT DEFAULT '#059669' NOT NULL,
        card_tag_scenic_color TEXT DEFAULT '#D97706' NOT NULL,
        home_background_image TEXT DEFAULT '/backgrounds/default-ferry-bg.jpg',
        home_background_overlay_opacity TEXT DEFAULT '0.6' NOT NULL,
        home_background_overlay_color TEXT DEFAULT '#0C4B7D' NOT NULL,
        google_analytics_id TEXT,
        contact_email TEXT,
        contact_phone TEXT,
        seo JSONB DEFAULT '{}' NOT NULL
    )",

    // ========== PORTS ==========
    "CREATE TABLE IF NOT EXISTS ports (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        country TEXT NOT NULL,
        city TEXT NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE NOT NULL
    )",

    // ========== LANGUAGES ==========
    "CREATE TABLE IF NOT EXISTS languages (
        id SERIAL PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        local_name TEXT,
        flag_emoji TEXT,
        rtl BOOLEAN DEFAULT FALSE NOT NULL,
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        is_default BOOLEAN DEFAULT FALSE NOT NULL
    )",

    // ========== CURRENCIES ==========
    "CREATE TABLE IF NOT EXISTS currencies (
        id SERIAL PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        symbol TEXT NOT NULL,
        exchange_rate NUMERIC DEFAULT 1 NOT NULL,
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        is_default BOOLEAN DEFAULT FALSE NOT NULL
    )",

    // ========== TRANSLATIONS ==========
    "CREATE TABLE IF NOT EXISTS translations (
        id SERIAL PRIMARY KEY,
        language_id INTEGER NOT NULL REFERENCES languages(id),
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        context TEXT DEFAULT 'general' NOT NULL
    )",

    // ========== CAMPAIGNS ==========
    "CREATE TABLE IF NOT EXISTS campaigns (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT NOT NULL UNIQUE,
        description TEXT,
        discount_type TEXT NOT NULL,
        discount_amount TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        target_segment_id INTEGER,
        minimum_purchase_amount TEXT DEFAULT '0',
        maximum_discount_amount TEXT,
        usage_limit_per_customer INTEGER,
        total_usage_limit INTEGER,
        current_usage INTEGER DEFAULT 0,
        applies_to TEXT DEFAULT 'all_routes',
        applicable_route_ids TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )",

    // ========== AGENCIES (B2B) ==========
    "CREATE TABLE IF NOT EXISTS agencies (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'agency',
        parent_agency_id INTEGER,
        commission_rate NUMERIC NOT NULL,
        discount_rate NUMERIC,
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        current_balance NUMERIC DEFAULT 0 NOT NULL,
        logo_url TEXT,
        address TEXT,
        city TEXT,
        country TEXT,
        zip_code TEXT,
        phone TEXT,
        email TEXT,
        vat_number TEXT,
        contact_person TEXT,
        contract_start_date DATE,
        contract_end_date DATE,
        notes TEXT,
        payment_terms TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        user_id INTEGER NOT NULL REFERENCES users(id)
    )",

    // ========== AGENCY COMMISSION TIERS ==========
    "CREATE TABLE IF NOT EXISTS agency_commission_tiers (
        id SERIAL PRIMARY KEY,
        agency_id INTEGER NOT NULL REFERENCES agencies(id),
        commission_rate NUMERIC NOT NULL,
        min_sales_amount NUMERIC NOT NULL,
        max_sales_amount NUMERIC,
        start_date DATE,
        end_date DATE,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )",

    // ========== AGENCY BOOKINGS ==========
    "CREATE TABLE IF NOT EXISTS agency_bookings (
        id SERIAL PRIMARY KEY,
        agency_id INTEGER NOT NULL REFERENCES agencies(id),
        booking_id INTEGER NOT NULL REFERENCES bookings(id),
        commission_amount NUMERIC NOT NULL,
        commission_rate NUMERIC NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        notes TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )",

    // ========== AGENCY PAYMENTS ==========
    "CREATE TABLE IF NOT EXISTS agency_payments (
        id SERIAL PRIMARY KEY,
        agency_id INTEGER NOT NULL REFERENCES agencies(id),
        amount NUMERIC NOT NULL,
        payment_date DATE NOT NULL,
        payment_method TEXT NOT NULL,
        reference_number TEXT,
        status TEXT NOT NULL DEFAULT 'completed',
        description TEXT,
        attachment_url TEXT,
        created_by INTEGER NOT NULL REFERENCES users(id),
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )",

    // ========== REVIEWS ==========
    "CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        route_id INTEGER REFERENCES routes(id),
        booking_id INTEGER REFERENCES bookings(id),
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        title TEXT,
        comment TEXT,
        is_verified BOOLEAN DEFAULT FALSE,
        is_visible BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )",

    // ========== SEAT MAPS ==========
    "CREATE TABLE IF NOT EXISTS seat_maps (
        id SERIAL PRIMARY KEY,
        route_id INTEGER NOT NULL REFERENCES routes(id),
        map_data JSONB NOT NULL,
        is_active BOOLEAN DEFAULT TRUE NOT NULL
    )",

    // ========== SEAT RESERVATIONS ==========
    "CREATE TABLE IF NOT EXISTS seat_reservations (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER NOT NULL REFERENCES bookings(id),
        seat_map_id INTEGER NOT NULL REFERENCES seat_maps(id),
        seat_number TEXT NOT NULL,
        passenger_name TEXT NOT NULL,
        status TEXT DEFAULT 'reserved' NOT NULL
    )",

    // ========== REVENUE TABLES ==========
    "CREATE TABLE IF NOT EXISTS dynamic_pricing_rules (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        route_id INTEGER,
        condition_type TEXT NOT NULL,
        condition_value JSONB NOT NULL,
        price_adjustment_type TEXT NOT NULL,
        price_adjustment_value NUMERIC NOT NULL,
        priority INTEGER DEFAULT 0 NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        created_by INTEGER NOT NULL,
        last_applied TIMESTAMP,
        application_count INTEGER DEFAULT 0 NOT NULL
    )",

    // ========== COUNTRIES ==========
    "CREATE TABLE IF NOT EXISTS countries (
        id SERIAL PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        flag TEXT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE NOT NULL
    )",

    // ========== NOTIFICATIONS ==========
    "CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT DEFAULT 'info' NOT NULL,
        is_read BOOLEAN DEFAULT FALSE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        metadata JSONB DEFAULT '{}'
    )",

    // ========== SUPPORT MESSAGES ==========
    "CREATE TABLE IF NOT EXISTS support_messages (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT DEFAULT 'open' NOT NULL,
        priority TEXT DEFAULT 'normal' NOT NULL,
        assigned_to INTEGER,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )",
];

echo "=== FERİBOT YÖNETİM - Veritabanı Migration ===\n\n";

$success = 0;
$errors = 0;

foreach ($tables as $sql) {
    try {
        $db->exec($sql);
        // Extract table name
        preg_match('/CREATE TABLE IF NOT EXISTS (\w+)/', $sql, $matches);
        $tableName = $matches[1] ?? 'unknown';
        echo "[OK] Tablo: $tableName\n";
        $success++;
    } catch (PDOException $e) {
        preg_match('/CREATE TABLE IF NOT EXISTS (\w+)/', $sql, $matches);
        $tableName = $matches[1] ?? 'unknown';
        echo "[HATA] Tablo: $tableName - " . $e->getMessage() . "\n";
        $errors++;
    }
}

echo "\n=== Sonuç: $success başarılı, $errors hata ===\n";
