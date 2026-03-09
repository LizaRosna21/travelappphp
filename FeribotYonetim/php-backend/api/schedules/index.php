<?php
/**
 * Sefer API endpoint'leri
 */

function handleGetSchedules(array $params): void {
    global $db;
    $scheduleModel = new ScheduleModel($db);

    $routeId = Request::query('route_id');
    $date = Request::query('date');

    if ($routeId && $date) {
        $schedules = $scheduleModel->searchAvailable((int)$routeId, $date);
        // Add capacity info
        foreach ($schedules as &$schedule) {
            $schedule['capacity_info'] = $scheduleModel->getAvailableCapacity($schedule['id'], $date);
        }
    } elseif ($routeId) {
        $schedules = $scheduleModel->getByRoute((int)$routeId);
    } else {
        $schedules = $scheduleModel->getTodaySchedules();
    }

    Response::success($schedules);
}

function handleGetSchedule(array $params): void {
    global $db;
    $scheduleModel = new ScheduleModel($db);

    $schedule = $scheduleModel->findById((int)$params['id']);
    if (!$schedule) {
        Response::notFound('Sefer bulunamadı');
    }

    $date = Request::query('date', date('Y-m-d'));
    $schedule['capacity_info'] = $scheduleModel->getAvailableCapacity($schedule['id'], $date);

    Response::success($schedule);
}

function handleCreateSchedule(array $params): void {
    $data = Request::validate([
        'route_id' => 'required|integer',
        'departure_time' => 'required',
        'arrival_time' => 'required',
        'days_of_week' => 'required',
        'start_date' => 'required',
        'end_date' => 'required',
        'capacity' => 'required|integer',
    ]);

    $body = Request::body();
    $scheduleData = array_merge($data, [
        'passenger_capacity' => $body['passenger_capacity'] ?? 0,
        'vehicle_capacity' => $body['vehicle_capacity'] ?? 0,
        'is_active' => $body['is_active'] ?? true,
        'fare_type' => $body['fare_type'] ?? 'standard',
        'discounted_price' => $body['discounted_price'] ?? null,
        'has_promotion' => $body['has_promotion'] ?? false,
        'promotion_description' => $body['promotion_description'] ?? null,
        'checkin_location' => $body['checkin_location'] ?? null,
        'boarding_location' => $body['boarding_location'] ?? null,
    ]);

    global $db;
    $scheduleModel = new ScheduleModel($db);
    $schedule = $scheduleModel->create($scheduleData);

    Response::success($schedule, 'Sefer oluşturuldu', 201);
}

function handleUpdateSchedule(array $params): void {
    global $db;
    $scheduleModel = new ScheduleModel($db);

    $existing = $scheduleModel->findById((int)$params['id']);
    if (!$existing) {
        Response::notFound('Sefer bulunamadı');
    }

    $body = Request::body();
    $schedule = $scheduleModel->update((int)$params['id'], $body);

    Response::success($schedule, 'Sefer güncellendi');
}

function handleDeleteSchedule(array $params): void {
    global $db;
    $scheduleModel = new ScheduleModel($db);

    $existing = $scheduleModel->findById((int)$params['id']);
    if (!$existing) {
        Response::notFound('Sefer bulunamadı');
    }

    $scheduleModel->delete((int)$params['id']);
    Response::success(null, 'Sefer silindi');
}
