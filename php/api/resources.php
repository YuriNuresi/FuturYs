<?php
/**
 * 🚀 FUTURY - Resources API
 * Endpoint per gestione risorse di gioco
 * @version 1.0.0
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../core/ResourceManager.php';

// Gestione CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];
$resourceManager = new ResourceManager();

try {
    switch ($method) {
        case 'GET':
            handleGetResources($resourceManager);
            break;

        case 'POST':
            handlePostResources($resourceManager);
            break;

        case 'PUT':
            handlePutResources($resourceManager);
            break;

        default:
            sendError('Method not allowed', 405);
            break;
    }
} catch (Exception $e) {
    sendError($e->getMessage(), 500);
}

/**
 * GET /api/resources.php?session_id=1
 * Ottieni tutte le risorse per una sessione
 */
function handleGetResources($resourceManager) {
    $sessionId = $_GET['session_id'] ?? null;

    if (!$sessionId) {
        sendError('session_id parameter required', 400);
    }

    $resources = $resourceManager->getResources($sessionId);

    if ($resources) {
        // Aggiungi metadata risorse
        $enriched = [
            'session_id' => $sessionId,
            'resources' => [],
            'production_rates' => [],
            'last_updated' => $resources['last_updated']
        ];

        // Risorse principali
        foreach (ResourceManager::RESOURCES as $key => $info) {
            if (isset($resources[$key])) {
                $enriched['resources'][$key] = [
                    'value' => (int)$resources[$key],
                    'formatted' => ResourceManager::formatResource($key, $resources[$key]),
                    'name' => $info['name'],
                    'icon' => $info['icon'],
                    'color' => $info['color']
                ];
            }
        }

        // Production rates
        $enriched['production_rates'] = [
            'budget' => (int)$resources['budget_production'],
            'science_points' => (int)$resources['science_production'],
            'population' => (int)$resources['population_growth'],
            'energy' => (int)$resources['energy_production']
        ];

        sendSuccess($enriched);
    } else {
        sendError('Resources not found for this session', 404);
    }
}

/**
 * POST /api/resources.php
 * Inizializza risorse per nuova sessione
 * Body: { "session_id": 1, "starting_values": {...} }
 */
function handlePostResources($resourceManager) {
    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['session_id'])) {
        sendError('session_id required', 400);
    }

    $result = $resourceManager->initializeResources(
        $data['session_id'],
        $data['starting_values'] ?? []
    );

    if ($result) {
        sendSuccess([
            'message' => 'Resources initialized successfully',
            'resources_id' => $result
        ], 201);
    } else {
        sendError('Failed to initialize resources', 500);
    }
}

/**
 * PUT /api/resources.php
 * Modifica risorse
 * Body: {
 *   "session_id": 1,
 *   "action": "modify" | "consume" | "set_production",
 *   "resource": "budget",
 *   "amount": 1000
 * }
 */
function handlePutResources($resourceManager) {
    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['session_id']) || !isset($data['action'])) {
        sendError('session_id and action required', 400);
    }

    $sessionId = $data['session_id'];
    $action = $data['action'];

    switch ($action) {
        case 'modify':
            // Modifica singola risorsa
            if (!isset($data['resource']) || !isset($data['amount'])) {
                sendError('resource and amount required for modify action', 400);
            }

            $result = $resourceManager->modifyResource(
                $sessionId,
                $data['resource'],
                $data['amount']
            );

            if ($result['success']) {
                sendSuccess($result);
            } else {
                sendError($result['error'], 400);
            }
            break;

        case 'consume':
            // Consuma multiple risorse
            if (!isset($data['costs'])) {
                sendError('costs required for consume action', 400);
            }

            $result = $resourceManager->consumeResources($sessionId, $data['costs']);

            if ($result['success']) {
                sendSuccess($result);
            } else {
                sendError($result['error'], 400);
            }
            break;

        case 'set_production':
            // Modifica rate di produzione
            if (!isset($data['production_field']) || !isset($data['rate'])) {
                sendError('production_field and rate required', 400);
            }

            $success = $resourceManager->setProductionRate(
                $sessionId,
                $data['production_field'],
                $data['rate']
            );

            if ($success) {
                sendSuccess(['message' => 'Production rate updated']);
            } else {
                sendError('Invalid production field', 400);
            }
            break;

        case 'update':
            // Aggiorna risorse basandosi sul tempo
            if (!isset($data['years_elapsed'])) {
                sendError('years_elapsed required for update action', 400);
            }

            $result = $resourceManager->updateResources($sessionId, $data['years_elapsed']);

            if ($result['success']) {
                sendSuccess($result);
            } else {
                sendError($result['error'], 400);
            }
            break;

        default:
            sendError('Invalid action. Use: modify, consume, set_production, update', 400);
            break;
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
