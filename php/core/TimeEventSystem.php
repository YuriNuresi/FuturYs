<?php
/**
 * 🚀 FUTURY - Time-Based Event System
 * Sistema per trigger eventi basati sul tempo di gioco
 * @version 1.0.0
 */

require_once __DIR__ . '/../config/database.php';

class TimeEventSystem {
    private $db;
    private $events = [];

    public function __construct() {
        $this->db = getDB();
    }

    /**
     * Registra un nuovo evento temporale
     *
     * @param int $sessionId
     * @param float $triggerYear - Anno di gioco in cui triggerare
     * @param string $eventType - Tipo evento: 'RANDOM', 'TECH', 'MISSION', 'RESOURCE'
     * @param string $eventData - JSON con dati evento
     * @return int|false event_id
     */
    public function registerEvent($sessionId, $triggerYear, $eventType, $eventData) {
        return $this->db->insert(
            'INSERT INTO scheduled_events
             (session_id, trigger_year, event_type, event_data, is_triggered, created_at)
             VALUES (:session_id, :trigger_year, :event_type, :event_data, 0, CURRENT_TIMESTAMP)',
            [
                'session_id' => $sessionId,
                'trigger_year' => $triggerYear,
                'event_type' => $eventType,
                'event_data' => $eventData
            ]
        );
    }

    /**
     * Controlla e processa eventi che devono triggerare
     *
     * @param int $sessionId
     * @param float $currentYear
     * @return array Eventi triggerati
     */
    public function processEvents($sessionId, $currentYear) {
        // Recupera eventi non ancora triggerati per questa sessione
        $pendingEvents = $this->db->select(
            'SELECT * FROM scheduled_events
             WHERE session_id = :session_id
             AND is_triggered = 0
             AND trigger_year <= :current_year
             ORDER BY trigger_year ASC',
            [
                'session_id' => $sessionId,
                'current_year' => $currentYear
            ]
        );

        $triggeredEvents = [];

        foreach ($pendingEvents as $event) {
            // Marca evento come triggerato
            $this->db->update(
                'UPDATE scheduled_events
                 SET is_triggered = 1,
                     triggered_at = CURRENT_TIMESTAMP
                 WHERE id = :id',
                ['id' => $event['id']]
            );

            // Decodifica dati evento
            $eventData = json_decode($event['event_data'], true);

            $triggeredEvents[] = [
                'id' => $event['id'],
                'type' => $event['event_type'],
                'trigger_year' => (float)$event['trigger_year'],
                'data' => $eventData,
                'message' => $this->getEventMessage($event['event_type'], $eventData)
            ];

            // Log evento nel time_tracker
            $this->logEvent($sessionId, $currentYear, $event['event_type']);
        }

        return $triggeredEvents;
    }

    /**
     * Crea eventi programmati per una sessione (sample events)
     *
     * @param int $sessionId
     * @param float $startYear
     */
    public function createSampleEvents($sessionId, $startYear = 2100) {
        // Evento: Prima missione disponibile
        $this->registerEvent(
            $sessionId,
            $startYear + 0.1, // ~36 giorni dopo l'inizio
            'TUTORIAL',
            json_encode([
                'title' => 'First Mission Available',
                'description' => 'Your space program is ready for its first mission!',
                'action' => 'UNLOCK_MISSIONS'
            ])
        );

        // Evento: Scoperta tecnologica random
        $this->registerEvent(
            $sessionId,
            $startYear + 1, // 1 anno dopo
            'TECH',
            json_encode([
                'title' => 'Research Breakthrough',
                'description' => 'Scientists have made a breakthrough in propulsion technology!',
                'tech_id' => 'PROPULSION_BOOST_1',
                'bonus' => '+10% mission speed'
            ])
        );

        // Evento: Crisi risorse
        $this->registerEvent(
            $sessionId,
            $startYear + 2, // 2 anni dopo
            'RANDOM',
            json_encode([
                'title' => 'Budget Crisis',
                'description' => 'Global economic downturn affects space program funding.',
                'effect' => 'budget_penalty',
                'value' => -0.2, // -20% budget per 1 anno
                'duration' => 1.0
            ])
        );

        // Evento: Opportunità missione speciale
        $this->registerEvent(
            $sessionId,
            $startYear + 3, // 3 anni dopo
            'MISSION',
            json_encode([
                'title' => 'Special Mission Opportunity',
                'description' => 'A unique asteroid is passing near Mars. Limited time mission available!',
                'mission_id' => 'ASTEROID_2103',
                'expires' => $startYear + 3.2 // Scade dopo ~73 giorni
            ])
        );
    }

    /**
     * Ottieni tutti gli eventi programmati per una sessione
     *
     * @param int $sessionId
     * @param bool $includeTriggered
     * @return array
     */
    public function getSessionEvents($sessionId, $includeTriggered = false) {
        $sql = 'SELECT * FROM scheduled_events WHERE session_id = :session_id';

        if (!$includeTriggered) {
            $sql .= ' AND is_triggered = 0';
        }

        $sql .= ' ORDER BY trigger_year ASC';

        return $this->db->select($sql, ['session_id' => $sessionId]);
    }

    /**
     * Genera messaggio per tipo evento
     *
     * @param string $eventType
     * @param array $eventData
     * @return string
     */
    private function getEventMessage($eventType, $eventData) {
        switch ($eventType) {
            case 'TUTORIAL':
                return '📚 ' . ($eventData['title'] ?? 'Tutorial Event');
            case 'TECH':
                return '🔬 ' . ($eventData['title'] ?? 'Technology Event');
            case 'MISSION':
                return '🚀 ' . ($eventData['title'] ?? 'Mission Event');
            case 'RANDOM':
                return '⚠️ ' . ($eventData['title'] ?? 'Random Event');
            case 'RESOURCE':
                return '💰 ' . ($eventData['title'] ?? 'Resource Event');
            default:
                return '📡 ' . ($eventData['title'] ?? 'Game Event');
        }
    }

    /**
     * Log evento processato
     *
     * @param int $sessionId
     * @param float $gameYear
     * @param string $eventType
     */
    private function logEvent($sessionId, $gameYear, $eventType) {
        $this->db->update(
            'UPDATE time_tracker
             SET events_processed = events_processed + 1
             WHERE session_id = :session_id
             ORDER BY id DESC
             LIMIT 1',
            ['session_id' => $sessionId]
        );
    }

    /**
     * Cancella evento programmato
     *
     * @param int $eventId
     * @return bool
     */
    public function cancelEvent($eventId) {
        $affected = $this->db->delete(
            'DELETE FROM scheduled_events WHERE id = :id',
            ['id' => $eventId]
        );

        return $affected > 0;
    }
}
?>
