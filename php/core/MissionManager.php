<?php
/**
 * 🚀 FUTURY - Mission Manager
 * Gestione missioni spaziali con tempi realistici e costi
 * @version 1.0.0
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/ResourceManager.php';

class MissionManager {
    private $db;
    private $resourceManager;

    // Mission statuses
    const STATUS_PREPARING = 'PREPARING';
    const STATUS_TRAVELING = 'TRAVELING';
    const STATUS_ARRIVED = 'ARRIVED';
    const STATUS_RETURNING = 'RETURNING';
    const STATUS_COMPLETED = 'COMPLETED';
    const STATUS_FAILED = 'FAILED';

    // Realistic travel times (in game years)
    // Based on: 24h real = 1 year game, so travel times scaled for gameplay
    // Aligned with JS core/MissionManager.js for consistency
    const TRAVEL_TIMES = [
        'Earth-Moon' => 0.125,      // 3 hours real (~1 game month)
        'Earth-Mars' => 2.5,        // 2.5 days real (6-9 months narrative)
        'Earth-Jupiter' => 5.5,     // 5.5 days real (12-18 months narrative)
        'Earth-Saturn' => 8.0,      // 8 days real (2-3 years narrative)
        'Earth-Uranus' => 12.0,     // 12 days real (3-4 years narrative)
        'Earth-Neptune' => 15.0,    // 15 days real (4-5 years narrative)
        'Mars-Jupiter' => 3.0,      // 3 days real
        'Mars-Saturn' => 5.5,       // 5.5 days real
    ];

    // Mission costs (resources required)
    const MISSION_COSTS = [
        'Moon' => [
            'budget' => 100000,
            'science' => 500,
            'energy' => 50,
            'materials' => 10
        ],
        'Mars' => [
            'budget' => 500000,
            'science' => 2000,
            'energy' => 200,
            'materials' => 50
        ],
        'Jupiter' => [
            'budget' => 2000000,
            'science' => 10000,
            'energy' => 500,
            'materials' => 100
        ],
        'Saturn' => [
            'budget' => 5000000,
            'science' => 25000,
            'energy' => 1000,
            'materials' => 200
        ],
        'Uranus' => [
            'budget' => 10000000,
            'science' => 50000,
            'energy' => 2000,
            'materials' => 500
        ],
        'Neptune' => [
            'budget' => 20000000,
            'science' => 100000,
            'energy' => 5000,
            'materials' => 1000
        ]
    ];

    public function __construct() {
        $this->db = getDB();
        $this->resourceManager = new ResourceManager();
    }

    /**
     * Calculate travel time between two planets
     */
    public function calculateTravelTime($fromPlanet, $toPlanet) {
        $route = "{$fromPlanet}-{$toPlanet}";
        $reverseRoute = "{$toPlanet}-{$fromPlanet}";

        if (isset(self::TRAVEL_TIMES[$route])) {
            return self::TRAVEL_TIMES[$route];
        } elseif (isset(self::TRAVEL_TIMES[$reverseRoute])) {
            return self::TRAVEL_TIMES[$reverseRoute];
        }

        // Fallback: estimate based on distance
        return $this->estimateTravelTime($fromPlanet, $toPlanet);
    }

    /**
     * Estimate travel time based on planet positions
     */
    private function estimateTravelTime($fromPlanet, $toPlanet) {
        // Simplified: assume proportional to distance
        // Default to Earth as origin
        $distances = [
            'Mercury' => 0.39, 'Venus' => 0.72, 'Earth' => 1.0,
            'Mars' => 1.52, 'Jupiter' => 5.2, 'Saturn' => 9.54,
            'Uranus' => 19.2, 'Neptune' => 30.06
        ];

        $dist1 = $distances[$fromPlanet] ?? 1.0;
        $dist2 = $distances[$toPlanet] ?? 1.0;
        $distance = abs($dist2 - $dist1);

        // Scale: 1 AU ≈ 4.8 game years (~4.8 real days)
        // Based on Earth-Mars (0.52 AU) = 2.5 game years
        return $distance * 4.8;
    }

    /**
     * Get mission cost for destination
     */
    public function getMissionCost($destination) {
        return self::MISSION_COSTS[$destination] ?? [
            'budget' => 1000000,
            'science' => 5000,
            'energy' => 100,
            'materials' => 20
        ];
    }

    /**
     * Create new mission
     */
    public function createMission($sessionId, $missionData) {
        $destination = $missionData['destination'];
        $origin = $missionData['origin'] ?? 'Earth';

        // Calculate costs and travel time
        $costs = $this->getMissionCost($destination);
        $travelTime = $this->calculateTravelTime($origin, $destination);

        // Check if player can afford
        if (!$this->resourceManager->canAfford($sessionId, $costs)) {
            return [
                'success' => false,
                'error' => 'Insufficient resources',
                'missing' => $this->resourceManager->getMissingResources($costs)
            ];
        }

        // Consume resources
        $consumeResult = $this->resourceManager->consumeResources($sessionId, $costs);

        if (!$consumeResult['success']) {
            return $consumeResult;
        }

        // Get current game year
        $session = $this->db->selectOne(
            'SELECT current_game_year FROM game_sessions WHERE id = :id',
            ['id' => $sessionId]
        );

        $currentYear = (float)$session['current_game_year'];
        $arrivalYear = $currentYear + $travelTime;

        // Create mission
        $missionId = $this->db->insert(
            'INSERT INTO missions
             (session_id, mission_name, origin_planet, destination_planet, status,
              launch_year, arrival_year, travel_time_years, mission_type, mission_data)
             VALUES (:session_id, :name, :origin, :destination, :status,
                     :launch_year, :arrival_year, :travel_time, :type, :data)',
            [
                'session_id' => $sessionId,
                'name' => $missionData['name'] ?? "Mission to {$destination}",
                'origin' => $origin,
                'destination' => $destination,
                'status' => self::STATUS_TRAVELING,
                'launch_year' => $currentYear,
                'arrival_year' => $arrivalYear,
                'travel_time' => $travelTime,
                'type' => $missionData['type'] ?? 'EXPLORATION',
                'data' => json_encode($missionData)
            ]
        );

        return [
            'success' => true,
            'mission_id' => $missionId,
            'costs' => $costs,
            'travel_time_years' => $travelTime,
            'arrival_year' => $arrivalYear,
            'travel_time_real_hours' => $travelTime * 24
        ];
    }

    /**
     * Update mission status based on current game year
     */
    public function updateMissionStatus($missionId, $currentYear) {
        $mission = $this->db->selectOne(
            'SELECT * FROM missions WHERE id = :id',
            ['id' => $missionId]
        );

        if (!$mission) {
            return ['success' => false, 'error' => 'Mission not found'];
        }

        $status = $mission['status'];
        $arrivalYear = (float)$mission['arrival_year'];

        // Check if mission has arrived
        if ($status === self::STATUS_TRAVELING && $currentYear >= $arrivalYear) {
            $this->db->update(
                'UPDATE missions SET status = :status, completed_at = CURRENT_TIMESTAMP WHERE id = :id',
                ['status' => self::STATUS_ARRIVED, 'id' => $missionId]
            );

            return [
                'success' => true,
                'status_changed' => true,
                'new_status' => self::STATUS_ARRIVED,
                'message' => "Mission {$mission['mission_name']} has arrived at {$mission['destination_planet']}!"
            ];
        }

        return [
            'success' => true,
            'status_changed' => false,
            'current_status' => $status,
            'progress' => $this->calculateProgress($mission, $currentYear)
        ];
    }

    /**
     * Calculate mission progress (0-1)
     */
    private function calculateProgress($mission, $currentYear) {
        $launchYear = (float)$mission['launch_year'];
        $arrivalYear = (float)$mission['arrival_year'];

        if ($currentYear <= $launchYear) return 0;
        if ($currentYear >= $arrivalYear) return 1;

        return ($currentYear - $launchYear) / ($arrivalYear - $launchYear);
    }

    /**
     * Get all missions for session
     */
    public function getSessionMissions($sessionId, $statusFilter = null) {
        $sql = 'SELECT * FROM missions WHERE session_id = :session_id';
        $params = ['session_id' => $sessionId];

        if ($statusFilter) {
            $sql .= ' AND status = :status';
            $params['status'] = $statusFilter;
        }

        $sql .= ' ORDER BY launch_year DESC';

        return $this->db->select($sql, $params);
    }

    /**
     * Update all active missions for session
     */
    public function updateAllMissions($sessionId, $currentYear) {
        $activeMissions = $this->getSessionMissions($sessionId, self::STATUS_TRAVELING);
        $updates = [];

        foreach ($activeMissions as $mission) {
            $result = $this->updateMissionStatus($mission['id'], $currentYear);
            if ($result['status_changed']) {
                $updates[] = $result;
            }
        }

        return [
            'success' => true,
            'missions_checked' => count($activeMissions),
            'missions_updated' => count($updates),
            'updates' => $updates
        ];
    }

    /**
     * Get mission details with formatted data
     */
    public function getMissionDetails($missionId) {
        $mission = $this->db->selectOne(
            'SELECT * FROM missions WHERE id = :id',
            ['id' => $missionId]
        );

        if (!$mission) {
            return ['success' => false, 'error' => 'Mission not found'];
        }

        return [
            'success' => true,
            'mission' => [
                'id' => $mission['id'],
                'name' => $mission['mission_name'],
                'origin' => $mission['origin_planet'],
                'destination' => $mission['destination_planet'],
                'status' => $mission['status'],
                'launch_year' => (float)$mission['launch_year'],
                'arrival_year' => (float)$mission['arrival_year'],
                'travel_time_years' => (float)$mission['travel_time_years'],
                'travel_time_real_hours' => (float)$mission['travel_time_years'] * 24,
                'type' => $mission['mission_type'],
                'data' => json_decode($mission['mission_data'], true)
            ]
        ];
    }

    /**
     * Format travel time for display
     */
    public static function formatTravelTime($years) {
        $hours = $years * 24;

        if ($hours < 24) {
            return sprintf('%.1f hours', $hours);
        } else {
            $days = $hours / 24;
            return sprintf('%.1f days', $days);
        }
    }
}
?>
