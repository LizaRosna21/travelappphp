<?php
/**
 * Çeviri / Dil API endpoint'leri
 */

function handleGetLanguages(array $params): void {
    global $db;
    $stmt = $db->query("SELECT * FROM languages WHERE is_active = true ORDER BY is_default DESC, name");
    Response::success($stmt->fetchAll());
}

function handleGetTranslations(array $params): void {
    global $db;
    $langCode = $params['lang'] ?? Request::query('lang', 'tr');

    $stmt = $db->prepare(
        "SELECT t.key, t.value, t.context
         FROM translations t
         JOIN languages l ON t.language_id = l.id
         WHERE l.code = :lang
         ORDER BY t.context, t.key"
    );
    $stmt->execute([':lang' => $langCode]);
    $translations = $stmt->fetchAll();

    // Key-value formatına çevir
    $result = [];
    foreach ($translations as $t) {
        $result[$t['context']][$t['key']] = $t['value'];
    }

    Response::success($result);
}

function handleGetCurrencies(array $params): void {
    global $db;
    $stmt = $db->query("SELECT * FROM currencies WHERE is_active = true ORDER BY is_default DESC, code");
    Response::success($stmt->fetchAll());
}

function handleGetPorts(array $params): void {
    global $db;
    $portModel = new PortModel($db);

    $search = Request::query('search');
    if ($search) {
        $ports = $portModel->searchPorts($search);
    } else {
        $ports = $portModel->getActivePorts();
    }

    Response::success($ports);
}
