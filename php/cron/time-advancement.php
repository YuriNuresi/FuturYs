<?php
/**
 * 🚀 FUTURY - Time Advancement Cron Job
 *
 * Aggiorna il tempo di gioco per tutte le sessioni attive
 * e processa eventi temporali
 *
 * USAGE:
 * - Eseguire ogni minuto via cron: * * * * * php /path/to/time-advancement.php
 * - O manualmente: php time-advancement.php
 *
 * @version 1.0.0
 */

require_once __DIR__ . '/../core/TimeManager.php';
require_once __DIR__ . '/../core/TimeEventSystem.php';

class TimeAdvancementCron {
    private $timeManager;
    private $eventSystem;
    private $db;
    private $logFile;

    public function __construct() {
        $this->timeManager = new TimeManager();
        $this->eventSystem = new TimeEventSystem();
        $this->db = getDB();
        $this->logFile = __DIR__ . '/../../logs/time-advancement.log';
    }

    /**
     * Esegui avanzamento tempo per tutte le sessioni attive
     */
    public function run() {
        $this->log('=== Time Advancement Cron Started ===');

        try {
            // Ottieni tutte le sessioni attive (non in pausa)
            $activeSessions = $this->getActiveSessions();

            $this->log('Found ' . count($activeSessions) . ' active sessions');

            $updated = 0;
            $eventsTriggered = 0;

            foreach ($activeSessions as $session) {
                $sessionId = $session['id'];

                // Aggiorna tempo sessione (include calcolo offline)
                $result = $this->timeManager->updateGameTime($sessionId);

                if ($result['success']) {
                    $updated++;
                    $currentYear = $result['game_year'];

                    $this->log("Session #{$sessionId}: Updated to year " .
                               number_format($currentYear, 4));

                    // Processa eventi temporali
                    $events = $this->eventSystem->processEvents($sessionId, $currentYear);

                    if (!empty($events)) {
                        $eventsTriggered += count($events);
                        $this->log("Session #{$sessionId}: Triggered " .
                                   count($events) . " events");

                        // Log eventi triggerati
                        foreach ($events as $event) {
                            $this->log("  - Event #{$event['id']}: {$event['message']}");
                        }

                        // Salva eventi nel save_data della sessione
                        $this->saveEventsToSession($sessionId, $events);
                    }
                } else {
                    $this->log("Session #{$sessionId}: ERROR - " .
                               ($result['error'] ?? 'Unknown error'), 'ERROR');
                }
            }

            $this->log("=== Cron Completed: {$updated} sessions updated, " .
                       "{$eventsTriggered} events triggered ===");

            return [
                'success' => true,
                'sessions_updated' => $updated,
                'events_triggered' => $eventsTriggered
            ];

        } catch (Exception $e) {
            $this->log('FATAL ERROR: ' . $e->getMessage(), 'ERROR');
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Ottieni sessioni di gioco attive
     */
    private function getActiveSessions() {
        return $this->db->select(
            'SELECT id, player_id, current_game_year, is_paused, last_update
             FROM game_sessions
             WHERE is_paused = 0
             ORDER BY id ASC'
        );
    }

    /**
     * Salva eventi triggerati nel save_data della sessione
     */
    private function saveEventsToSession($sessionId, $events) {
        $session = $this->timeManager->getSession($sessionId);
        $saveData = json_decode($session['save_data'] ?? '{}', true);

        if (!isset($saveData['pending_events'])) {
            $saveData['pending_events'] = [];
        }

        // Aggiungi nuovi eventi
        foreach ($events as $event) {
            $saveData['pending_events'][] = [
                'id' => $event['id'],
                'type' => $event['type'],
                'message' => $event['message'],
                'data' => $event['data'],
                'trigger_year' => $event['trigger_year'],
                'shown' => false
            ];
        }

        // Aggiorna database
        $this->db->update(
            'UPDATE game_sessions
             SET save_data = :save_data
             WHERE id = :session_id',
            [
                'save_data' => json_encode($saveData),
                'session_id' => $sessionId
            ]
        );
    }

    /**
     * Log con timestamp
     */
    private function log($message, $level = 'INFO') {
        $timestamp = date('Y-m-d H:i:s');
        $logMessage = "[{$timestamp}] [{$level}] {$message}\n";

        // Crea directory log se non esiste
        $logDir = dirname($this->logFile);
        if (!file_exists($logDir)) {
            mkdir($logDir, 0755, true);
        }

        // Scrivi log
        file_put_contents($this->logFile, $logMessage, FILE_APPEND | LOCK_EX);

        // Output anche su console
        echo $logMessage;
    }
}

// ===========================
// ESECUZIONE
// ===========================

// Se chiamato direttamente, esegui cron
if (basename($_SERVER['PHP_SELF']) === 'time-advancement.php') {
    $cron = new TimeAdvancementCron();
    $result = $cron->run();

    exit($result['success'] ? 0 : 1);
}
?>
