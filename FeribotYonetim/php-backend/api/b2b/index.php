<?php
/**
 * B2B Acente API endpoint'leri
 */

function handleGetAgencies(array $params): void {
    global $db;
    $agencyModel = new AgencyModel($db);
    $agencies = $agencyModel->getActiveAgencies();
    Response::success($agencies);
}

function handleGetAgency(array $params): void {
    global $db;
    $agencyModel = new AgencyModel($db);

    $agency = $agencyModel->getAgencyWithDetails((int)$params['id']);
    if (!$agency) {
        Response::notFound('Acente bulunamadı');
    }

    Response::success($agency);
}

function handleCreateAgency(array $params): void {
    $data = Request::validate([
        'name' => 'required',
        'code' => 'required',
        'commission_rate' => 'required|numeric',
    ]);

    $currentUser = AuthMiddleware::currentUser();
    $body = Request::body();

    $agencyData = array_merge($data, [
        'user_id' => $currentUser['id'],
        'type' => $body['type'] ?? 'agency',
        'email' => $body['email'] ?? null,
        'phone' => $body['phone'] ?? null,
        'address' => $body['address'] ?? null,
        'city' => $body['city'] ?? null,
        'country' => $body['country'] ?? null,
        'contact_person' => $body['contact_person'] ?? null,
        'is_active' => $body['is_active'] ?? true,
        'current_balance' => '0',
        'created_at' => date('Y-m-d H:i:s'),
        'updated_at' => date('Y-m-d H:i:s'),
    ]);

    global $db;
    $agencyModel = new AgencyModel($db);
    $agency = $agencyModel->create($agencyData);

    Response::success($agency, 'Acente oluşturuldu', 201);
}

function handleUpdateAgency(array $params): void {
    global $db;
    $agencyModel = new AgencyModel($db);

    $existing = $agencyModel->findById((int)$params['id']);
    if (!$existing) {
        Response::notFound('Acente bulunamadı');
    }

    $body = Request::body();
    $body['updated_at'] = date('Y-m-d H:i:s');
    $agency = $agencyModel->update((int)$params['id'], $body);

    Response::success($agency, 'Acente güncellendi');
}

function handleGetAgencyPayments(array $params): void {
    global $db;
    $agencyModel = new AgencyModel($db);
    $payments = $agencyModel->getAgencyPayments((int)$params['id']);
    Response::success($payments);
}
