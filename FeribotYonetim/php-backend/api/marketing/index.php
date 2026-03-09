<?php
/**
 * Pazarlama / Kampanya API endpoint'leri
 */

function handleGetCampaigns(array $params): void {
    global $db;
    $campaignModel = new CampaignModel($db);

    $activeOnly = Request::query('active');
    if ($activeOnly) {
        $campaigns = $campaignModel->getActiveCampaigns();
    } else {
        $campaigns = $campaignModel->findAll([], 'created_at DESC');
    }

    Response::success($campaigns);
}

function handleGetCampaign(array $params): void {
    global $db;
    $campaignModel = new CampaignModel($db);

    $campaign = $campaignModel->findById((int)$params['id']);
    if (!$campaign) {
        Response::notFound('Kampanya bulunamadı');
    }

    Response::success($campaign);
}

function handleCreateCampaign(array $params): void {
    $data = Request::validate([
        'name' => 'required',
        'code' => 'required',
        'discount_type' => 'required',
        'discount_amount' => 'required',
        'start_date' => 'required',
        'end_date' => 'required',
    ]);

    $body = Request::body();
    $campaignData = array_merge($data, [
        'code' => strtoupper($data['code']),
        'description' => $body['description'] ?? null,
        'is_active' => $body['is_active'] ?? true,
        'minimum_purchase_amount' => $body['minimum_purchase_amount'] ?? '0',
        'maximum_discount_amount' => $body['maximum_discount_amount'] ?? null,
        'usage_limit_per_customer' => $body['usage_limit_per_customer'] ?? null,
        'total_usage_limit' => $body['total_usage_limit'] ?? null,
        'current_usage' => 0,
        'applies_to' => $body['applies_to'] ?? 'all_routes',
        'applicable_route_ids' => $body['applicable_route_ids'] ?? null,
        'created_at' => date('Y-m-d H:i:s'),
        'updated_at' => date('Y-m-d H:i:s'),
    ]);

    global $db;
    $campaignModel = new CampaignModel($db);
    $campaign = $campaignModel->create($campaignData);

    Response::success($campaign, 'Kampanya oluşturuldu', 201);
}

function handleValidateCoupon(array $params): void {
    $code = Request::get('code');
    $routeId = Request::get('route_id');

    if (!$code) {
        Response::error('Kupon kodu gerekli', 400);
    }

    global $db;
    $campaignModel = new CampaignModel($db);
    $campaign = $campaignModel->validateCoupon($code, $routeId ? (int)$routeId : null);

    if (!$campaign) {
        Response::error('Geçersiz veya süresi dolmuş kupon', 400);
    }

    Response::success([
        'valid' => true,
        'discount_type' => $campaign['discount_type'],
        'discount_amount' => $campaign['discount_amount'],
        'campaign_name' => $campaign['name'],
    ]);
}
