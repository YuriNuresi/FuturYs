<?php
/**
 * 🚀 FUTURY - Save/Load API
 * Endpoint per salvataggio e caricamento partite
 * @version 1.0.0
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../core/SaveManager.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];
$saveManager = new SaveManager();

try {
    switch ($method) {
        case 'GET':
            handleGet($saveManager);
            break;
        case 'POST':
            handlePost($saveManager);
            break;
        case 'PUT':
            handlePut($saveManager);
            break;
        default:
            sendError('Method not allowed', 405);
    }
} catch (Exception $e) {
    sendError($e->getMessage(), 500);
}

/**
 * GET /api/save.php?session_id=1&action=info|state
 */
function handleGet($saveManager) {
    $sessionId = $_GET['session_id'] ?? null;
    $action = $_GET['action'] ?? 'state';

    if (!$sessionId) {
        sendError('session_id required', 400);
    }

    if ($action === 'info') {
        $result = $saveManager->getSaveInfo($sessionId);
    } else {
        $result = $saveManager->getGameState($sessionId);
    }

    if ($result['success']) {
        sendSuccess($result);
    } else {
        sendError($result['error'], 404);
    }
}

/**
 * POST /api/save.php
 * Body: { "session_id": 1, "action": "save" }
 */
function handlePost($saveManager) {
    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['session_id'])) {
        sendError('session_id required', 400);
    }

    $action = $data['action'] ?? 'save';

    if ($action === 'save' || $action === 'autosave') {
        if ($action === 'autosave') {
            $result = $saveManager->autoSave($data['session_id']);
        } else {
            $result = $saveManager->saveGameState($data['session_id']);
        }

        if ($result['success']) {
            sendSuccess($result);
        } else {
            sendError($result['error'], 500);
        }
    } else {
        sendError('Invalid action', 400);
    }
}

/**
 * PUT /api/save.php
 * Body: { "session_id": 1, "action": "load" }
 */
function handlePut($saveManager) {
    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['session_id'])) {
        sendError('session_id required', 400);
    }

    $action = $data['action'] ?? 'load';

    if ($action === 'load') {
        $loadResult = $saveManager->loadGameState($data['session_id']);

        if (!$loadResult['success']) {
            sendError($loadResult['error'], 404);
        }

        $restoreResult = $saveManager->restoreGameState(
            $data['session_id'],
            $loadResult['game_state']
        );

        if ($restoreResult['success']) {
            sendSuccess([
                'message' => $restoreResult['message'],
                'game_state' => $loadResult['game_state']
            ]);
        } else {
            sendError($restoreResult['error'], 500);
        }
    } else {
        sendError('Invalid action', 400);
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
