<?php
/**
 * 🚀 FUTURY - Missions API
 * Endpoint per gestione missioni spaziali
 * @version 1.0.0
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../core/MissionManager.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];
$missionManager = new MissionManager();

try {
    switch ($method) {
        case 'GET':
            handleGetMissions($missionManager);
            break;
        case 'POST':
            handlePostMission($missionManager);
            break;
        case 'PUT':
            handlePutMission($missionManager);
            break;
        default:
            sendError('Method not allowed', 405);
    }
} catch (Exception $e) {
    sendError($e->getMessage(), 500);
}

/**
 * GET /api/missions.php?session_id=1&mission_id=5
 */
function handleGetMissions($missionManager) {
    $sessionId = $_GET['session_id'] ?? null;
    $missionId = $_GET['mission_id'] ?? null;

    if ($missionId) {
        $result = $missionManager->getMissionDetails($missionId);
        if ($result['success']) {
            sendSuccess($result['mission']);
        } else {
            sendError($result['error'], 404);
        }
    } elseif ($sessionId) {
        $status = $_GET['status'] ?? null;
        $missions = $missionManager->getSessionMissions($sessionId, $status);
        sendSuccess([
            'missions' => $missions,
            'count' => count($missions)
        ]);
    } else {
        sendError('session_id or mission_id required', 400);
    }
}

/**
 * POST /api/missions.php
 * Body: {
 *   "session_id": 1,
 *   "name": "Mars Explorer",
 *   "destination": "Mars",
 *   "origin": "Earth",
 *   "type": "EXPLORATION"
 * }
 */
function handlePostMission($missionManager) {
    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['session_id']) || !isset($data['destination'])) {
        sendError('session_id and destination required', 400);
    }

    $result = $missionManager->createMission($data['session_id'], $data);

    if ($result['success']) {
        sendSuccess($result, 201);
    } else {
        sendError($result['error'], 400);
    }
}

/**
 * PUT /api/missions.php
 * Body: {
 *   "mission_id": 1,
 *   "current_year": 2100.5,
 *   "action": "update_status"
 * }
 */
function handlePutMission($missionManager) {
    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['mission_id']) || !isset($data['current_year'])) {
        sendError('mission_id and current_year required', 400);
    }

    $result = $missionManager->updateMissionStatus($data['mission_id'], $data['current_year']);

    if ($result['success']) {
        sendSuccess($result);
    } else {
        sendError($result['error'], 400);
    }
}

function sendSuccess($data, $code = 200) {
    http_response_code($code);
    echo json_encode(['success' => true, 'data' => $data], JSON_PRETTY_PRINT);
    exit();
}

function sendError($message, $code = 400) {
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $message], JSON_PRETTY_PRINT);
    exit();
}
?>
