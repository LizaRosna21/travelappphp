<?php
/**
 * Rezervasyon API endpoint'leri
 */

function handleGetBookings(array $params): void {
    global $db;
    $bookingModel = new BookingModel($db);

    $currentUser = AuthMiddleware::currentUser();

    // Admin tüm rezervasyonları görebilir
    if (in_array($currentUser['role'], ['admin', 'superadmin'])) {
        $status = Request::query('status');
        $page = (int)(Request::query('page', 1));
        $perPage = (int)(Request::query('per_page', 20));

        $where = [];
        if ($status) $where['status'] = $status;

        $total = $bookingModel->count($where);
        $bookings = $bookingModel->findAll($where, 'created_at DESC', $perPage, ($page - 1) * $perPage);

        Response::paginated($bookings, $total, $page, $perPage);
    } else {
        $bookings = $bookingModel->getByUser($currentUser['id']);
        Response::success($bookings);
    }
}

function handleGetBooking(array $params): void {
    global $db;
    $bookingModel = new BookingModel($db);

    $booking = $bookingModel->getDetailedBooking((int)$params['id']);
    if (!$booking) {
        Response::notFound('Rezervasyon bulunamadı');
    }

    // Kullanıcı sadece kendi rezervasyonunu görebilir
    $currentUser = AuthMiddleware::currentUser();
    if ($booking['user_id'] !== $currentUser['id'] && !in_array($currentUser['role'], ['admin', 'superadmin'])) {
        Response::forbidden('Bu rezervasyona erişim yetkiniz yok');
    }

    Response::success($booking);
}

function handleGetBookingByPNR(array $params): void {
    global $db;
    $bookingModel = new BookingModel($db);

    $pnr = $params['pnr'] ?? Request::query('pnr');
    if (!$pnr) {
        Response::error('PNR numarası gerekli', 400);
    }

    $booking = $bookingModel->getByPNR(strtoupper($pnr));
    if (!$booking) {
        Response::notFound('Rezervasyon bulunamadı');
    }

    Response::success($booking);
}

function handleCreateBooking(array $params): void {
    $data = Request::validate([
        'route_id' => 'required|integer',
        'schedule_id' => 'required|integer',
        'departure_date' => 'required',
        'total_price' => 'required|numeric',
    ]);

    global $db;
    $bookingModel = new BookingModel($db);
    $scheduleModel = new ScheduleModel($db);

    // Kapasite kontrolü
    $capacity = $scheduleModel->getAvailableCapacity((int)$data['schedule_id'], $data['departure_date']);
    if ($capacity['available'] <= 0) {
        Response::error('Bu sefer için yer kalmamıştır', 400);
    }

    $currentUser = AuthMiddleware::currentUser();
    $body = Request::body();

    $bookingData = [
        'user_id' => $currentUser['id'],
        'route_id' => (int)$data['route_id'],
        'schedule_id' => (int)$data['schedule_id'],
        'departure_date' => $data['departure_date'],
        'return_date' => $body['return_date'] ?? null,
        'total_price' => $data['total_price'],
        'currency' => $body['currency'] ?? 'try',
        'notes' => $body['notes'] ?? null,
        'guest_email' => $body['guest_email'] ?? null,
        'guest_name' => $body['guest_name'] ?? null,
    ];

    $booking = $bookingModel->createBooking($bookingData);

    // Yolcuları ekle
    $passengers = $body['passengers'] ?? [];
    foreach ($passengers as $passenger) {
        $bookingModel->addPassenger([
            'booking_id' => $booking['id'],
            'passenger_type_id' => $passenger['passenger_type_id'],
            'first_name' => $passenger['first_name'],
            'last_name' => $passenger['last_name'],
            'document_number' => $passenger['document_number'] ?? null,
            'birth_date' => $passenger['birth_date'] ?? null,
            'contact' => $passenger['contact'] ?? null,
        ]);
    }

    // Araçları ekle
    $vehicles = $body['vehicles'] ?? [];
    foreach ($vehicles as $vehicle) {
        $bookingModel->addVehicle([
            'booking_id' => $booking['id'],
            'vehicle_type_id' => $vehicle['vehicle_type_id'],
            'license_plate' => $vehicle['license_plate'] ?? null,
        ]);
    }

    // Detaylı bilgiyi döndür
    $detailedBooking = $bookingModel->getDetailedBooking($booking['id']);

    Response::success($detailedBooking, 'Rezervasyon oluşturuldu', 201);
}

function handleUpdateBooking(array $params): void {
    global $db;
    $bookingModel = new BookingModel($db);

    $booking = $bookingModel->findById((int)$params['id']);
    if (!$booking) {
        Response::notFound('Rezervasyon bulunamadı');
    }

    $body = Request::body();
    $updated = $bookingModel->update((int)$params['id'], array_merge($body, ['updated_at' => date('Y-m-d H:i:s')]));

    Response::success($updated, 'Rezervasyon güncellendi');
}

function handleCancelBooking(array $params): void {
    global $db;
    $bookingModel = new BookingModel($db);

    $booking = $bookingModel->findById((int)$params['id']);
    if (!$booking) {
        Response::notFound('Rezervasyon bulunamadı');
    }

    if ($booking['status'] === 'cancelled') {
        Response::error('Rezervasyon zaten iptal edilmiş', 400);
    }

    $body = Request::body();
    $cancelled = $bookingModel->cancelBooking((int)$params['id'], $body['reason'] ?? null);

    Response::success($cancelled, 'Rezervasyon iptal edildi');
}

function handleConfirmPayment(array $params): void {
    global $db;
    $bookingModel = new BookingModel($db);

    $booking = $bookingModel->findById((int)$params['id']);
    if (!$booking) {
        Response::notFound('Rezervasyon bulunamadı');
    }

    $body = Request::body();
    $confirmed = $bookingModel->confirmPayment(
        (int)$params['id'],
        $body['payment_method'] ?? 'manual',
        $body['payment_intent_id'] ?? null
    );

    Response::success($confirmed, 'Ödeme onaylandı');
}
