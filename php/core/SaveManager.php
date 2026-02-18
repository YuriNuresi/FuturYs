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

        if ($session) return;

        // Use raw PDO to bypass FK constraints and get actual errors
        $pdo = $this->db->getConnection();

        try {
            $pdo->exec('PRAGMA foreign_keys = OFF');
            $pdo->beginTransaction();

            // Create default player if missing
            $player = $pdo->query('SELECT id FROM players WHERE id = 1')->fetch();
            if (!$player) {
                $pdo->exec("INSERT INTO players (id, username, email, password_hash, nation_id) VALUES (1, 'default', 'default@futury.game', 'none', 1)");
            }

            // Create session
            $stmt = $pdo->prepare('INSERT INTO game_sessions (id, player_id, session_name, game_start_year, current_game_year, real_start_time, last_update, is_paused) VALUES (?, 1, ?, 2100, 2100, datetime("now"), datetime("now"), 0)');
            $stmt->execute([$sessionId, 'Session ' . $sessionId]);

            // Create default resources
            $stmt = $pdo->prepare('INSERT INTO player_resources (session_id, budget, science_points, population, energy, materials, food, water, oxygen, budget_production, science_production, population_growth, energy_production) VALUES (?, 1000000, 10000, 500000000, 1000, 500, 1000, 1000, 1000, 50000, 500, 1000000, 50)');
            $stmt->execute([$sessionId]);

            $pdo->commit();
            $pdo->exec('PRAGMA foreign_keys = ON');

            error_log("[SaveManager] Auto-created player + session {$sessionId}");
        } catch (\Exception $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            $pdo->exec('PRAGMA foreign_keys = ON');
            error_log("[SaveManager] FAILED to create session {$sessionId}: " . $e->getMessage());
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
     * @param int $sessionId
     * @param array|null $clientState - game state sent from the browser
     */
    public function saveGameState($sessionId, $clientState = null) {
        // If client sent game state, update DB tables first
        if ($clientState) {
            // Update current game year
            if (isset($clientState['session']['current_game_year'])) {
                $this->db->update(
                    'UPDATE game_sessions SET current_game_year = :year WHERE id = :id',
                    ['year' => $clientState['session']['current_game_year'], 'id' => $sessionId]
                );
            }

            // Update resources from client
            if (isset($clientState['resources'])) {
                $r = $clientState['resources'];
                $this->db->update(
                    'UPDATE player_resources SET budget = :budget, science_points = :science,
                     population = :pop, energy = :energy, materials = :mat,
                     food = :food, water = :water, oxygen = :oxy
                     WHERE session_id = :sid',
                    [
                        'budget' => $r['budget'] ?? 0, 'science' => $r['science'] ?? 0,
                        'pop' => $r['population'] ?? 0, 'energy' => $r['energy'] ?? 0,
                        'mat' => $r['materials'] ?? 0, 'food' => $r['food'] ?? 0,
                        'water' => $r['water'] ?? 0, 'oxy' => $r['oxygen'] ?? 0,
                        'sid' => $sessionId
                    ]
                );
            }
        }

        // Read full state from DB (now updated) and save as JSON snapshot
        $stateResult = $this->getGameState($sessionId);

        if (!$stateResult['success']) {
            return $stateResult;
        }

        $gameState = $stateResult['game_state'];

        // Merge client missions into the snapshot (missions live client-side)
        if ($clientState && isset($clientState['missions'])) {
            $gameState['missions'] = $clientState['missions'];
        }

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
    public function autoSave($sessionId, $clientState = null) {
        $result = $this->saveGameState($sessionId, $clientState);

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
            'SELECT gs.session_name, gs.last_update, gs.save_data, n.code as nation_code
             FROM game_sessions gs
             JOIN players p ON gs.player_id = p.id
             JOIN nations n ON p.nation_id = n.id
             WHERE gs.id = :id',
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
            'nation_code' => $session['nation_code'],
            'last_save' => $hasSave ? $saveData['saved_at'] : null,
            'last_update' => $session['last_update']
        ];
    }
}
?>
