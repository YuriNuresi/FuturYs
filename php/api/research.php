<?php
/**
 * 🔬 FUTURY - Research API (card_710)
 * Endpoint per gestione tecnologie e albero ricerca
 * @version 1.0.0
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    match ($method) {
        'GET' => handleGetResearch(),
        'POST' => handlePostResearch(),
        default => sendError('Method not allowed', 405)
    };
} catch (Exception $e) {
    sendError($e->getMessage(), 500);
}

/**
 * Seed technologies if table is empty
 */
function seedTechnologies(): void {
    $db = Database::getInstance();
    $count = $db->selectOne("SELECT COUNT(*) as cnt FROM technologies");
    if ($count && $count['cnt'] > 0) return;

    $techs = [
        // PROPULSION - Tier 1
        ['CHEMICAL_ROCKETS', 'Chemical Rockets', 'PROPULSION', 1, '[]', 5000, 0.5,
         '{"mission_speed_bonus": 0.1}', 'Basic chemical propulsion systems', 'The beginning of space travel'],
        ['ION_DRIVE', 'Ion Drive', 'PROPULSION', 2, '["CHEMICAL_ROCKETS"]', 15000, 1.0,
         '{"mission_speed_bonus": 0.25}', 'Efficient ion propulsion for deep space', 'Slow but steady wins the race'],
        ['NUCLEAR_THERMAL', 'Nuclear Thermal Engine', 'PROPULSION', 2, '["CHEMICAL_ROCKETS"]', 20000, 1.5,
         '{"mission_speed_bonus": 0.3, "mission_cost_reduction": 0.1}', 'Nuclear-powered rocket engines', 'Harnessing the atom for travel'],
        ['FUSION_DRIVE', 'Fusion Drive', 'PROPULSION', 3, '["ION_DRIVE","NUCLEAR_THERMAL"]', 50000, 2.0,
         '{"mission_speed_bonus": 0.5, "unlock_outer_planets": true}', 'Fusion-powered propulsion for interplanetary travel', 'The stars are within reach'],

        // HABITAT - Tier 1
        ['BASIC_HABITAT', 'Basic Habitat Module', 'HABITAT', 1, '[]', 8000, 0.5,
         '{"colony_capacity_bonus": 50, "unlock_building": "HABITAT_MODULE"}', 'Pressurized living quarters for colonists', 'Home away from home'],
        ['LIFE_SUPPORT', 'Advanced Life Support', 'HABITAT', 2, '["BASIC_HABITAT"]', 18000, 1.0,
         '{"colony_happiness_bonus": 10, "oxygen_production_bonus": 0.2}', 'Recycling systems for air, water and waste', 'Breathing easy on another world'],
        ['TERRAFORMING_BASICS', 'Terraforming Basics', 'HABITAT', 3, '["LIFE_SUPPORT"]', 40000, 2.0,
         '{"habitability_bonus": 0.15, "unlock_building": "TERRAFORMER"}', 'Initial atmospheric modification techniques', 'Reshaping worlds to our needs'],
        ['BIODOME', 'Biodome Engineering', 'HABITAT', 2, '["BASIC_HABITAT"]', 12000, 0.8,
         '{"food_production_bonus": 0.3, "unlock_building": "BIODOME"}', 'Self-sustaining enclosed ecosystems', 'A garden among the stars'],

        // ENERGY - Tier 1
        ['SOLAR_PANELS', 'Advanced Solar Panels', 'ENERGY', 1, '[]', 6000, 0.4,
         '{"energy_production_bonus": 0.2}', 'High-efficiency photovoltaic cells', 'Harnessing the sun'],
        ['NUCLEAR_FISSION', 'Nuclear Fission Reactor', 'ENERGY', 2, '["SOLAR_PANELS"]', 22000, 1.2,
         '{"energy_production_bonus": 0.4, "unlock_building": "NUCLEAR_PLANT"}', 'Compact fission reactors for colonies', 'Splitting atoms for power'],
        ['FUSION_REACTOR', 'Fusion Reactor', 'ENERGY', 3, '["NUCLEAR_FISSION"]', 55000, 2.5,
         '{"energy_production_bonus": 0.8, "unlock_building": "FUSION_PLANT"}', 'Clean unlimited fusion energy', 'The power of stars'],

        // MINING - Tier 1
        ['BASIC_MINING', 'Basic Mining Operations', 'MINING', 1, '[]', 5000, 0.3,
         '{"materials_production_bonus": 0.15}', 'Surface mining and extraction techniques', 'Digging into new worlds'],
        ['DEEP_DRILLING', 'Deep Core Drilling', 'MINING', 2, '["BASIC_MINING"]', 16000, 1.0,
         '{"materials_production_bonus": 0.3, "unlock_building": "DEEP_MINE"}', 'Access deep planetary mineral deposits', 'Going deeper'],
        ['ASTEROID_MINING', 'Asteroid Mining', 'MINING', 3, '["DEEP_DRILLING"]', 35000, 1.5,
         '{"materials_production_bonus": 0.5, "budget_production_bonus": 0.2}', 'Autonomous asteroid mining operations', 'Wealth from space rocks'],
        ['WATER_EXTRACTION', 'Water Extraction', 'MINING', 2, '["BASIC_MINING"]', 10000, 0.7,
         '{"water_production_bonus": 0.3, "unlock_building": "WATER_EXTRACTOR"}', 'Extract water from ice and regolith', 'The most precious resource'],

        // COMMUNICATION - Tier 1
        ['RADIO_ARRAY', 'Deep Space Radio Array', 'COMMUNICATION', 1, '[]', 4000, 0.3,
         '{"science_production_bonus": 0.1}', 'Long-range radio communication systems', 'Reaching across the void'],
        ['LASER_COMM', 'Laser Communication', 'COMMUNICATION', 2, '["RADIO_ARRAY"]', 14000, 0.8,
         '{"science_production_bonus": 0.2, "mission_speed_bonus": 0.05}', 'High-bandwidth laser communication', 'Beams of data across space'],
        ['QUANTUM_ENTANGLEMENT', 'Quantum Entanglement Comm', 'COMMUNICATION', 3, '["LASER_COMM"]', 45000, 2.0,
         '{"science_production_bonus": 0.4, "instant_colony_control": true}', 'Instantaneous communication via quantum entanglement', 'Beyond the speed of light'],
    ];

    $sql = "INSERT INTO technologies (tech_code, name, category, tier, prerequisite_tech_ids, science_cost, research_time_years, effects_data, description, flavor_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

    foreach ($techs as $tech) {
        $db->insert($sql, $tech);
    }
}

/**
 * GET /api/research.php - Get technologies
 * ?session_id=1 - Get all techs with session-specific status
 */
function handleGetResearch(): void {
    $db = Database::getInstance();
    seedTechnologies();

    $sessionId = $_GET['session_id'] ?? null;

    if ($sessionId) {
        // Get technologies with per-session research status
        $techs = $db->select("
            SELECT t.*,
                   COALESCE(pt.status, 'LOCKED') as research_status,
                   COALESCE(pt.research_progress, 0.0) as progress,
                   pt.research_start_year,
                   pt.research_completion_year,
                   pt.science_invested
            FROM technologies t
            LEFT JOIN player_technologies pt ON pt.technology_id = t.id AND pt.session_id = ?
            ORDER BY t.category, t.tier, t.id
        ", [$sessionId]);

        // Determine which LOCKED techs should be AVAILABLE
        $completedCodes = [];
        foreach ($techs as $t) {
            if ($t['research_status'] === 'COMPLETED') {
                $completedCodes[] = $t['tech_code'];
            }
        }

        foreach ($techs as &$tech) {
            if ($tech['research_status'] === 'LOCKED') {
                $prereqs = json_decode($tech['prerequisite_tech_ids'] ?: '[]', true);
                if (empty($prereqs) || count(array_diff($prereqs, $completedCodes)) === 0) {
                    $tech['research_status'] = 'AVAILABLE';
                }
            }
            // Parse JSON fields
            $tech['effects_data'] = json_decode($tech['effects_data'] ?: '{}', true);
            $tech['prerequisite_tech_ids'] = json_decode($tech['prerequisite_tech_ids'] ?: '[]', true);
        }
        unset($tech);
    } else {
        $techs = $db->select("SELECT * FROM technologies ORDER BY category, tier, id");
        foreach ($techs as &$tech) {
            $tech['effects_data'] = json_decode($tech['effects_data'] ?: '{}', true);
            $tech['prerequisite_tech_ids'] = json_decode($tech['prerequisite_tech_ids'] ?: '[]', true);
        }
        unset($tech);
    }

    sendSuccess(['technologies' => $techs]);
}

/**
 * POST /api/research.php - Start research on a technology
 * Body: { "session_id": 1, "tech_id": 5 }
 */
function handlePostResearch(): void {
    $db = Database::getInstance();
    $input = json_decode(file_get_contents('php://input'), true);

    $sessionId = $input['session_id'] ?? null;
    $techId = $input['tech_id'] ?? null;

    if (!$sessionId || !$techId) {
        sendError('session_id and tech_id are required', 400);
        return;
    }

    // Get the technology
    $tech = $db->selectOne("SELECT * FROM technologies WHERE id = ?", [$techId]);
    if (!$tech) {
        sendError('Technology not found', 404);
        return;
    }

    // Check if already researching something
    $researching = $db->selectOne("
        SELECT pt.*, t.name FROM player_technologies pt
        JOIN technologies t ON t.id = pt.technology_id
        WHERE pt.session_id = ? AND pt.status = 'RESEARCHING'
    ", [$sessionId]);
    if ($researching) {
        sendError("Already researching: {$researching['name']}", 400);
        return;
    }

    // Check prerequisites
    $prereqs = json_decode($tech['prerequisite_tech_ids'] ?: '[]', true);
    if (!empty($prereqs)) {
        $placeholders = implode(',', array_fill(0, count($prereqs), '?'));
        $completed = $db->select("
            SELECT t.tech_code FROM player_technologies pt
            JOIN technologies t ON t.id = pt.technology_id
            WHERE pt.session_id = ? AND pt.status = 'COMPLETED' AND t.tech_code IN ($placeholders)
        ", array_merge([$sessionId], $prereqs));

        $completedCodes = array_column($completed, 'tech_code');
        $missing = array_diff($prereqs, $completedCodes);
        if (!empty($missing)) {
            sendError('Missing prerequisites: ' . implode(', ', $missing), 400);
            return;
        }
    }

    // Check resources
    $resources = $db->selectOne("SELECT science_points FROM player_resources WHERE session_id = ?", [$sessionId]);
    if (!$resources || $resources['science_points'] < $tech['science_cost']) {
        sendError("Insufficient science points. Need {$tech['science_cost']}, have " . ($resources['science_points'] ?? 0), 400);
        return;
    }

    // Deduct science and start research
    $db->beginTransaction();
    try {
        // Deduct science
        $db->update("UPDATE player_resources SET science_points = science_points - ? WHERE session_id = ?",
            [$tech['science_cost'], $sessionId]);

        // Get current game year
        $session = $db->selectOne("SELECT current_game_year FROM game_sessions WHERE id = ?", [$sessionId]);
        $currentYear = $session['current_game_year'] ?? 2100;
        $completionYear = $currentYear + $tech['research_time_years'];

        // Upsert player_technologies
        $existing = $db->selectOne("SELECT id FROM player_technologies WHERE session_id = ? AND technology_id = ?", [$sessionId, $techId]);
        if ($existing) {
            $db->update("UPDATE player_technologies SET status = 'RESEARCHING', research_progress = 0.0, research_start_year = ?, research_completion_year = ?, science_invested = ? WHERE id = ?",
                [$currentYear, $completionYear, $tech['science_cost'], $existing['id']]);
        } else {
            $db->insert("INSERT INTO player_technologies (session_id, technology_id, status, research_progress, research_start_year, research_completion_year, science_invested) VALUES (?, ?, 'RESEARCHING', 0.0, ?, ?, ?)",
                [$sessionId, $techId, $currentYear, $completionYear, $tech['science_cost']]);
        }

        $db->commit();

        sendSuccess([
            'message' => "Research started: {$tech['name']}",
            'tech_id' => $techId,
            'completion_year' => $completionYear,
            'science_cost' => $tech['science_cost']
        ]);
    } catch (Exception $e) {
        $db->rollback();
        sendError('Failed to start research: ' . $e->getMessage(), 500);
    }
}

function sendSuccess($data): void {
    echo json_encode(['success' => true, 'data' => $data]);
    exit();
}

function sendError($message, $code = 400): void {
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $message]);
    exit();
}
