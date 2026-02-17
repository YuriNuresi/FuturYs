<?php
/**
 * 🚀 FUTURY - Save Manager
 * Gestione salvataggio/caricamento stato di gioco
 * @version 1.0.0
 */

require_once __DIR__ . '/../config/database.php';

class SaveManager {
    private $db;

    public function __construct() {
        $this->db = getDB();
    }

    /**
     * Ensure a game session exists, create if missing
     */
    public function ensureSessionExists($sessionId) {
        $session = $this->db->selectOne(
            'SELECT id FROM game_sessions WHERE id = :id',
            ['id' => $sessionId]
        );

        if (!$session) {
            // Create default session
            $this->db->insert(
                'INSERT INTO game_sessions (id, player_id, session_name, game_start_year, current_game_year, real_start_time, last_update, is_paused)
                 VALUES (:id, 1, :name, 2100, 2100, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0)',
                ['id' => $sessionId, 'name' => 'Session ' . $sessionId]
            );

            // Create default resources
            $this->db->insert(
                'INSERT INTO player_resources (session_id, budget, science_points, population, energy, materials, food, water, oxygen, budget_production, science_production, population_growth, energy_production)
                 VALUES (:sid, 1000000, 10000, 500000000, 1000, 500, 1000, 1000, 1000, 50000, 500, 1000000, 50)',
                ['sid' => $sessionId]
            );

            error_log("[SaveManager] Auto-created session {$sessionId}");
        }
    }

    /**
     * Get complete game state
     */
    public function getGameState($sessionId) {
        // Get session info
        $session = $this->db->selectOne(
            'SELECT * FROM game_sessions WHERE id = :id',
            ['id' => $sessionId]
        );

        if (!$session) {
            return ['success' => false, 'error' => 'Session not found'];
        }

        // Get resources
        $resources = $this->db->selectOne(
            'SELECT * FROM player_resources WHERE session_id = :id',
            ['id' => $sessionId]
        );

        // Get missions
        $missions = $this->db->select(
            'SELECT * FROM missions WHERE session_id = :id',
            ['id' => $sessionId]
        );

        // Get technologies (if exists)
        $technologies = $this->db->select(
            'SELECT * FROM player_technologies WHERE session_id = :id',
            ['id' => $sessionId]
        );

        // Get colonies (if exists)
        $colonies = $this->db->select(
            'SELECT * FROM colonies WHERE session_id = :id',
            ['id' => $sessionId]
        );

        // Build complete game state
        $gameState = [
            'version' => '1.0.0',
            'saved_at' => date('Y-m-d H:i:s'),
            'session' => [
                'id' => $session['id'],
                'name' => $session['session_name'],
                'player_id' => $session['player_id'],
                'game_start_year' => (float)$session['game_start_year'],
                'current_game_year' => (float)$session['current_game_year'],
                'real_start_time' => $session['real_start_time'],
                'last_update' => $session['last_update'],
                'is_paused' => (bool)$session['is_paused']
            ],
            'resources' => $resources ? [
                'budget' => (int)$resources['budget'],
                'science_points' => (int)$resources['science_points'],
                'population' => (int)$resources['population'],
                'energy' => (int)$resources['energy'],
                'materials' => (int)$resources['materials'],
                'food' => (int)$resources['food'],
                'water' => (int)$resources['water'],
                'oxygen' => (int)$resources['oxygen'],
                'production_rates' => [
                    'budget' => (int)$resources['budget_production'],
                    'science_points' => (int)$resources['science_production'],
                    'population' => (int)$resources['population_growth'],
                    'energy' => (int)$resources['energy_production']
                ]
            ] : null,
            'missions' => array_map(function($m) {
                return [
                    'id' => $m['id'],
                    'name' => $m['mission_name'],
                    'origin' => $m['origin_planet'],
                    'destination' => $m['destination_planet'],
                    'status' => $m['status'],
                    'launch_year' => (float)$m['launch_year'],
                    'arrival_year' => (float)$m['arrival_year'],
                    'travel_time_years' => (float)$m['travel_time_years'],
                    'type' => $m['mission_type']
                ];
            }, $missions),
            'technologies' => $technologies,
            'colonies' => $colonies
        ];

        return [
            'success' => true,
            'game_state' => $gameState
        ];
    }

    /**
     * Save game state to database
     */
    public function saveGameState($sessionId) {
        $stateResult = $this->getGameState($sessionId);

        if (!$stateResult['success']) {
            return $stateResult;
        }

        $gameState = $stateResult['game_state'];

        // Update save_data in game_sessions
        $affected = $this->db->update(
            'UPDATE game_sessions
             SET save_data = :save_data,
                 last_update = CURRENT_TIMESTAMP
             WHERE id = :session_id',
            [
                'save_data' => json_encode($gameState),
                'session_id' => $sessionId
            ]
        );

        if ($affected > 0) {
            return [
                'success' => true,
                'message' => 'Game saved successfully',
                'saved_at' => $gameState['saved_at']
            ];
        } else {
            return [
                'success' => false,
                'error' => 'Failed to save game'
            ];
        }
    }

    /**
     * Load game state from database
     */
    public function loadGameState($sessionId) {
        $session = $this->db->selectOne(
            'SELECT save_data FROM game_sessions WHERE id = :id',
            ['id' => $sessionId]
        );

        if (!$session || !$session['save_data']) {
            return ['success' => false, 'error' => 'No save data found'];
        }

        $gameState = json_decode($session['save_data'], true);

        return [
            'success' => true,
            'game_state' => $gameState
        ];
    }

    /**
     * Restore game state (apply loaded state to database)
     */
    public function restoreGameState($sessionId, $gameState) {
        $this->db->beginTransaction();

        try {
            // Restore session data
            if (isset($gameState['session'])) {
                $this->db->update(
                    'UPDATE game_sessions
                     SET current_game_year = :year,
                         is_paused = :paused
                     WHERE id = :id',
                    [
                        'year' => $gameState['session']['current_game_year'],
                        'paused' => $gameState['session']['is_paused'] ? 1 : 0,
                        'id' => $sessionId
                    ]
                );
            }

            // Restore resources
            if (isset($gameState['resources'])) {
                $r = $gameState['resources'];
                $this->db->update(
                    'UPDATE player_resources
                     SET budget = :budget,
                         science_points = :science,
                         population = :population,
                         energy = :energy,
                         materials = :materials,
                         food = :food,
                         water = :water,
                         oxygen = :oxygen
                     WHERE session_id = :session_id',
                    [
                        'budget' => $r['budget'],
                        'science' => $r['science_points'],
                        'population' => $r['population'],
                        'energy' => $r['energy'],
                        'materials' => $r['materials'],
                        'food' => $r['food'],
                        'water' => $r['water'],
                        'oxygen' => $r['oxygen'],
                        'session_id' => $sessionId
                    ]
                );
            }

            $this->db->commit();

            return [
                'success' => true,
                'message' => 'Game loaded successfully'
            ];

        } catch (Exception $e) {
            $this->db->rollback();
            return [
                'success' => false,
                'error' => 'Failed to restore game state: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Auto-save game
     */
    public function autoSave($sessionId) {
        $result = $this->saveGameState($sessionId);

        if ($result['success']) {
            // Log autosave
            error_log("[AUTOSAVE] Session {$sessionId} saved at {$result['saved_at']}");
        }

        return $result;
    }

    /**
     * Get save file info
     */
    public function getSaveInfo($sessionId) {
        $session = $this->db->selectOne(
            'SELECT session_name, last_update, save_data FROM game_sessions WHERE id = :id',
            ['id' => $sessionId]
        );

        if (!$session) {
            return ['success' => false, 'error' => 'Session not found'];
        }

        $hasSave = !empty($session['save_data']);
        $saveData = $hasSave ? json_decode($session['save_data'], true) : null;

        return [
            'success' => true,
            'has_save' => $hasSave,
            'session_name' => $session['session_name'],
            'last_save' => $hasSave ? $saveData['saved_at'] : null,
            'last_update' => $session['last_update']
        ];
    }
}
?>
