<?php
/**
 * 🏗️ FUTURY - Buildings API
 * Endpoint per ottenere informazioni sugli edifici costruibili
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

    handleGetBuildings();

} catch (Exception $e) {
    sendError($e->getMessage(), 500);
}

/**
 * GET /api/buildings.php - Get all building types
 * GET /api/buildings.php?code=RESEARCH_CENTER - Get specific building by code
 */
function handleGetBuildings() {
    $db = Database::getInstance();
    $buildingCode = $_GET['code'] ?? null;

    if ($buildingCode) {
        // Get specific building by code
        $building = $db->selectOne(
            "SELECT * FROM buildings WHERE building_code = ?",
            [$buildingCode]
        );

        if ($building) {
            sendSuccess($building);
        } else {
            sendError('Building not found', 404);
        }
    } else {
        // Get all buildings
        $buildings = $db->select(
            "SELECT * FROM buildings ORDER BY category, budget_cost"
        );

        sendSuccess($buildings);
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
