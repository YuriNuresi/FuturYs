<?php
/**
 * 🚀 FUTURY - Nations API
 * Endpoint per ottenere informazioni sulle nazioni giocabili
 * @version 1.0.0
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method !== 'GET') {
        sendError('Method not allowed', 405);
    }

    handleGetNations();

} catch (Exception $e) {
    sendError($e->getMessage(), 500);
}

/**
 * GET /api/nations.php - Get all playable nations
 * GET /api/nations.php?code=USA - Get specific nation by code
 */
function handleGetNations() {
    $db = Database::getInstance();
    $nationCode = $_GET['code'] ?? null;

    if ($nationCode) {
        // Get specific nation by code
        $nation = $db->selectOne(
            "SELECT * FROM nations WHERE code = ? AND is_playable = 1",
            [$nationCode]
        );

        if ($nation) {
            sendSuccess($nation);
        } else {
            sendError('Nation not found', 404);
        }
    } else {
        // Get all playable nations
        $nations = $db->select(
            "SELECT * FROM nations WHERE is_playable = 1 ORDER BY
            CASE
                WHEN code IN ('USA', 'CHN', 'RUS', 'ESA', 'IND') THEN 1
                ELSE 2
            END,
            code"
        );

        sendSuccess($nations);
    }
}

/**
 * Send success response
 */
function sendSuccess($data, $code = 200) {
    http_response_code($code);
    echo json_encode([
        'success' => true,
        'data' => $data
    ]);
    exit();
}

/**
 * Send error response
 */
function sendError($message, $code = 400) {
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'error' => $message
    ]);
    exit();
}
