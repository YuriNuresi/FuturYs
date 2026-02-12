<?php
/**
 * 🚀 FUTURY - Resource Manager
 * Gestione risorse di gioco (Budget, Science, Population, Energy, Materials, Food, Water, Oxygen)
 * @version 1.0.0
 */

require_once __DIR__ . '/../config/database.php';

class ResourceManager {
    private $db;

    // Definizione risorse
    const RESOURCES = [
        'budget' => [
            'name' => 'Budget',
            'icon' => '💰',
            'unit' => 'Credits',
            'color' => '#FFD700'
        ],
        'science_points' => [
            'name' => 'Science',
            'icon' => '🔬',
            'unit' => 'Points',
            'color' => '#00CED1'
        ],
        'population' => [
            'name' => 'Population',
            'icon' => '👥',
            'unit' => 'People',
            'color' => '#FF6B6B'
        ],
        'energy' => [
            'name' => 'Energy',
            'icon' => '⚡',
            'unit' => 'Units',
            'color' => '#FFB84D'
        ],
        'materials' => [
            'name' => 'Materials',
            'icon' => '⚙️',
            'unit' => 'Tons',
            'color' => '#A8A8A8'
        ],
        'food' => [
            'name' => 'Food',
            'icon' => '🌾',
            'unit' => 'Tons',
            'color' => '#90EE90'
        ],
        'water' => [
            'name' => 'Water',
            'icon' => '💧',
            'unit' => 'Liters',
            'color' => '#4FC3F7'
        ],
        'oxygen' => [
            'name' => 'Oxygen',
            'icon' => '🫁',
            'unit' => 'Units',
            'color' => '#B0E0E6'
        ]
    ];

    public function __construct() {
        $this->db = getDB();
    }

    /**
     * Ottieni tutte le risorse per una sessione
     *
     * @param int $sessionId
     * @return array|false
     */
    public function getResources($sessionId) {
        return $this->db->selectOne(
            'SELECT * FROM player_resources WHERE session_id = :session_id',
            ['session_id' => $sessionId]
        );
    }

    /**
     * Inizializza risorse per una nuova sessione
     *
     * @param int $sessionId
     * @param array $startingValues Override valori iniziali
     * @return int|false
     */
    public function initializeResources($sessionId, $startingValues = []) {
        $defaults = [
            'budget' => 1000000,
            'science_points' => 10000,
            'population' => 500000000,
            'energy' => 1000,
            'materials' => 0,
            'food' => 0,
            'water' => 0,
            'oxygen' => 0,
            'budget_production' => 1000,
            'science_production' => 100,
            'population_growth' => 1000,
            'energy_production' => 10
        ];

        $values = array_merge($defaults, $startingValues);
        $values['session_id'] = $sessionId;

        return $this->db->insert(
            'INSERT INTO player_resources
             (session_id, budget, science_points, population, energy, materials, food, water, oxygen,
              budget_production, science_production, population_growth, energy_production)
             VALUES (:session_id, :budget, :science_points, :population, :energy, :materials, :food, :water, :oxygen,
                     :budget_production, :science_production, :population_growth, :energy_production)',
            $values
        );
    }

    /**
     * Aggiorna risorse basandosi sul tempo trascorso
     *
     * @param int $sessionId
     * @param float $yearsElapsed Anni di gioco trascorsi
     * @return array Risultato aggiornamento
     */
    public function updateResources($sessionId, $yearsElapsed) {
        $resources = $this->getResources($sessionId);

        if (!$resources) {
            return ['success' => false, 'error' => 'Resources not found'];
        }

        // Calcola nuovi valori
        $newBudget = $resources['budget'] + ($resources['budget_production'] * $yearsElapsed);
        $newScience = $resources['science_points'] + ($resources['science_production'] * $yearsElapsed);
        $newPopulation = $this->calculatePopulationGrowth(
            $resources['population'],
            $resources['population_growth'],
            $yearsElapsed
        );
        $newEnergy = $resources['energy'] + ($resources['energy_production'] * $yearsElapsed);

        // Applica capacity limits
        $newBudget = min($newBudget, $resources['budget_capacity']);
        $newScience = min($newScience, $resources['science_capacity']);
        $newEnergy = min($newEnergy, 999999); // Hard cap

        // Update database
        $this->db->update(
            'UPDATE player_resources
             SET budget = :budget,
                 science_points = :science,
                 population = :population,
                 energy = :energy,
                 last_updated = CURRENT_TIMESTAMP
             WHERE session_id = :session_id',
            [
                'budget' => (int)$newBudget,
                'science' => (int)$newScience,
                'population' => (int)$newPopulation,
                'energy' => (int)$newEnergy,
                'session_id' => $sessionId
            ]
        );

        return [
            'success' => true,
            'changes' => [
                'budget' => (int)($newBudget - $resources['budget']),
                'science_points' => (int)($newScience - $resources['science_points']),
                'population' => (int)($newPopulation - $resources['population']),
                'energy' => (int)($newEnergy - $resources['energy'])
            ],
            'new_values' => [
                'budget' => (int)$newBudget,
                'science_points' => (int)$newScience,
                'population' => (int)$newPopulation,
                'energy' => (int)$newEnergy
            ]
        ];
    }

    /**
     * Calcola crescita popolazione (esponenziale)
     *
     * @param int $currentPop
     * @param float $growthRate Growth rate as decimal (e.g., 0.02 for 2%)
     * @param float $years
     * @return int
     */
    private function calculatePopulationGrowth($currentPop, $growthRate, $years) {
        // Exponential growth: P(t) = P0 × (1 + r)^t
        // Matches JS implementation: population *= (1 + growthRate * yearFraction)
        // Using pow() for fractional years
        $newPopulation = $currentPop * pow(1 + $growthRate, $years);

        return (int)$newPopulation;
    }

    /**
     * Modifica risorsa (aggiungi/rimuovi)
     *
     * @param int $sessionId
     * @param string $resourceName
     * @param int $amount (positivo = aggiungi, negativo = rimuovi)
     * @return array
     */
    public function modifyResource($sessionId, $resourceName, $amount) {
        if (!array_key_exists($resourceName, self::RESOURCES)) {
            return ['success' => false, 'error' => 'Invalid resource name'];
        }

        $resources = $this->getResources($sessionId);
        $currentValue = $resources[$resourceName] ?? 0;
        $newValue = max(0, $currentValue + $amount); // Non può essere negativo

        // Applica capacity se esiste
        $capacityField = $resourceName . '_capacity';
        if (isset($resources[$capacityField])) {
            $newValue = min($newValue, $resources[$capacityField]);
        }

        $affected = $this->db->update(
            "UPDATE player_resources
             SET {$resourceName} = :value,
                 last_updated = CURRENT_TIMESTAMP
             WHERE session_id = :session_id",
            [
                'value' => $newValue,
                'session_id' => $sessionId
            ]
        );

        return [
            'success' => $affected > 0,
            'resource' => $resourceName,
            'old_value' => $currentValue,
            'new_value' => $newValue,
            'change' => $newValue - $currentValue
        ];
    }

    /**
     * Modifica rate di produzione
     *
     * @param int $sessionId
     * @param string $productionField (es: 'budget_production')
     * @param int $newRate
     * @return bool
     */
    public function setProductionRate($sessionId, $productionField, $newRate) {
        $validFields = ['budget_production', 'science_production', 'population_growth', 'energy_production'];

        if (!in_array($productionField, $validFields)) {
            return false;
        }

        $affected = $this->db->update(
            "UPDATE player_resources
             SET {$productionField} = :rate
             WHERE session_id = :session_id",
            [
                'rate' => $newRate,
                'session_id' => $sessionId
            ]
        );

        return $affected > 0;
    }

    /**
     * Verifica se ci sono abbastanza risorse per un'azione
     *
     * @param int $sessionId
     * @param array $costs ['budget' => 1000, 'science_points' => 500]
     * @return bool
     */
    public function canAfford($sessionId, $costs) {
        $resources = $this->getResources($sessionId);

        foreach ($costs as $resource => $amount) {
            if (!isset($resources[$resource]) || $resources[$resource] < $amount) {
                return false;
            }
        }

        return true;
    }

    /**
     * Consuma risorse (per missioni, costruzioni, ecc.)
     *
     * @param int $sessionId
     * @param array $costs ['budget' => 1000, 'science_points' => 500]
     * @return array
     */
    public function consumeResources($sessionId, $costs) {
        if (!$this->canAfford($sessionId, $costs)) {
            return ['success' => false, 'error' => 'Insufficient resources'];
        }

        $results = [];

        foreach ($costs as $resource => $amount) {
            $result = $this->modifyResource($sessionId, $resource, -$amount);
            $results[$resource] = $result;
        }

        return [
            'success' => true,
            'consumed' => $costs,
            'results' => $results
        ];
    }

    /**
     * Formatta valore risorsa per display
     *
     * @param string $resourceName
     * @param int $value
     * @return string
     */
    public static function formatResource($resourceName, $value) {
        $info = self::RESOURCES[$resourceName] ?? ['icon' => '', 'unit' => ''];

        if ($value >= 1000000000) {
            return sprintf('%s %.2fB %s', $info['icon'], $value / 1000000000, $info['unit']);
        } elseif ($value >= 1000000) {
            return sprintf('%s %.2fM %s', $info['icon'], $value / 1000000, $info['unit']);
        } elseif ($value >= 1000) {
            return sprintf('%s %.2fK %s', $info['icon'], $value / 1000, $info['unit']);
        } else {
            return sprintf('%s %d %s', $info['icon'], $value, $info['unit']);
        }
    }

    /**
     * Ottieni info su tutte le risorse
     *
     * @return array
     */
    public static function getResourcesInfo() {
        return self::RESOURCES;
    }
}
?>
