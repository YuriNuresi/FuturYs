<?php
/**
 * 🚀 FUTURY - Time Sync API
 * Endpoint per sincronizzazione tempo client-server
 * @version 1.0.0
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../core/TimeManager.php';

// Gestione CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];
$timeManager = new TimeManager();

try {
    switch ($method) {
        case 'GET':
            handleGetTime($timeManager);
            break;

        case 'POST':
            handlePostTime($timeManager);
            break;

        case 'PUT':
            handlePutTime($timeManager);
            break;

        default:
            sendError('Method not allowed', 405);
            break;
    }
} catch (Exception $e) {
    sendError($e->getMessage(), 500);
}

/**
 * GET /api/time.php?session_id=1
 * Ottieni tempo corrente di gioco con calcolo offline
 *
 * OPTIMIZATION: No caching (realtime data)
 */
function handleGetTime($timeManager) {
    $sessionId = $_GET['session_id'] ?? null;

    if (!$sessionId) {
        sendError('session_id parameter required', 400);
    }

    $result = $timeManager->updateGameTime($sessionId);

    if ($result['success']) {
        // OPTIMIZATION: No cache for time (always fresh)
        header('Cache-Control: no-cache, must-revalidate');
        header('Pragma: no-cache');

        sendSuccess([
            'game_year' => $result['game_year'],
            'is_paused' => $result['is_paused'],
            'offline_years_elapsed' => $result['offline_years_elapsed'] ?? 0,
            'offline_hours' => $result['offline_real_hours'] ?? 0,
            'formatted' => TimeManager::formatGameYear($result['game_year']),
            'server_time' => time(),
            'time_scale' => [
                'real_hours' => 24,
                'game_years' => 1,
                'description' => '24 real hours = 1 game year'
            ]
        ]);
    } else {
        sendError($result['error'], 404);
    }
}

/**
 * POST /api/time.php
 * Crea nuova sessione di gioco
 * Body: { "player_id": 1, "session_name": "My Game", "start_year": 2100 }
 */
function handlePostTime($timeManager) {
    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['player_id'])) {
        sendError('player_id required', 400);
    }

    $sessionId = $timeManager->createSession(
        $data['player_id'],
        $data['session_name'] ?? 'New Game',
        $data['start_year'] ?? 2100
    );

    if ($sessionId) {
        $session = $timeManager->getSession($sessionId);
        sendSuccess([
            'message' => 'Session created successfully',
            'session_id' => $sessionId,
            'session' => $session
        ], 201);
    } else {
        sendError('Failed to create session', 500);
    }
}

/**
 * PUT /api/time.php
 * Aggiorna stato sessione (pause/resume)
 * Body: { "session_id": 1, "action": "pause" | "resume" }
 */
function handlePutTime($timeManager) {
    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['session_id']) || !isset($data['action'])) {
        sendError('session_id and action required', 400);
    }

    $sessionId = $data['session_id'];
    $action = $data['action'];

    if ($action === 'pause') {
        $result = $timeManager->togglePause($sessionId, true);
    } elseif ($action === 'resume') {
        $result = $timeManager->togglePause($sessionId, false);
    } else {
        sendError('Invalid action. Use "pause" or "resume"', 400);
    }

    if ($result) {
        $session = $timeManager->getSession($sessionId);
        sendSuccess([
            'message' => ucfirst($action) . ' successful',
            'is_paused' => (bool)$session['is_paused'],
            'game_year' => (float)$session['current_game_year']
        ]);
    } else {
        sendError('Failed to update session', 500);
    }
}

/**
 * Send JSON success response
 */
function sendSuccess($data, $code = 200) {
    http_response_code($code);
    echo json_encode([
        'success' => true,
        'data' => $data
    ], JSON_PRETTY_PRINT);
    exit();
}

/**
 * Send JSON error response
 */
function sendError($message, $code = 400) {
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'error' => $message
    ], JSON_PRETTY_PRINT);
    exit();
}
?>
