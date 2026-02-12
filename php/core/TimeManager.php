<?php
/**
 * 🚀 FUTURY - Backend Time Manager
 * Gestisce avanzamento tempo lato server con calcolo offline
 * @version 1.0.0
 */

require_once __DIR__ . '/../config/database.php';

class TimeManager {
    private $db;

    // Time scale: 24 hours real = 1 year game = 365.25 days
    const SECONDS_PER_YEAR = 86400; // 24 hours
    const TIME_SCALE = 1 / self::SECONDS_PER_YEAR; // ≈ 0.0000115740

    // Maximum offline time to prevent abuse (30 days real = 30 years game)
    const MAX_OFFLINE_DAYS = 30;
    const MAX_OFFLINE_SECONDS = self::MAX_OFFLINE_DAYS * 86400; // 2,592,000 seconds

    public function __construct() {
        $this->db = getDB();
    }

    /**
     * Aggiorna il tempo di gioco per una sessione
     * Include calcolo del tempo offline
     *
     * @param int $sessionId
     * @return array
     */
    public function updateGameTime($sessionId) {
        try {
            // Recupera sessione corrente
            $session = $this->getSession($sessionId);

            if (!$session) {
                return ['success' => false, 'error' => 'Session not found'];
            }

            // Se in pausa, ritorna stato corrente
            if ($session['is_paused']) {
                return [
                    'success' => true,
                    'game_year' => (float)$session['current_game_year'],
                    'is_paused' => true,
                    'message' => 'Game is paused'
                ];
            }

            // Calcola tempo offline
            $offlineCalculation = $this->calculateOfflineTime($session);

            // Aggiorna database
            $this->db->update(
                'UPDATE game_sessions
                 SET current_game_year = :game_year,
                     last_update = CURRENT_TIMESTAMP
                 WHERE id = :session_id',
                [
                    'game_year' => $offlineCalculation['new_game_year'],
                    'session_id' => $sessionId
                ]
            );

            // Log nel time_tracker
            $this->logTimeUpdate($sessionId, $offlineCalculation['new_game_year']);

            return [
                'success' => true,
                'game_year' => $offlineCalculation['new_game_year'],
                'offline_years_elapsed' => $offlineCalculation['years_elapsed'],
                'offline_real_hours' => $offlineCalculation['real_hours_elapsed'],
                'is_paused' => false
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Calcola il tempo offline trascorso
     *
     * @param array $session
     * @return array
     */
    public function calculateOfflineTime($session) {
        $now = time();
        $lastUpdate = strtotime($session['last_update']);
        $realSecondsElapsed = $now - $lastUpdate;

        // Cap offline time to prevent abuse
        $wasCapped = false;
        if ($realSecondsElapsed > self::MAX_OFFLINE_SECONDS) {
            $wasCapped = true;
            $originalSeconds = $realSecondsElapsed;
            $realSecondsElapsed = self::MAX_OFFLINE_SECONDS;
        }

        // Calcola anni di gioco trascorsi
        $yearsElapsed = $realSecondsElapsed * self::TIME_SCALE;
        $newGameYear = (float)$session['current_game_year'] + $yearsElapsed;

        $result = [
            'new_game_year' => $newGameYear,
            'years_elapsed' => $yearsElapsed,
            'real_seconds_elapsed' => $realSecondsElapsed,
            'real_hours_elapsed' => round($realSecondsElapsed / 3600, 2)
        ];

        // Add cap info if time was capped
        if ($wasCapped) {
            $result['was_capped'] = true;
            $result['original_seconds_elapsed'] = $originalSeconds;
            $result['max_offline_days'] = self::MAX_OFFLINE_DAYS;
        }

        return $result;
    }

    /**
     * Ottieni sessione di gioco
     *
     * @param int $sessionId
     * @return array|false
     */
    public function getSession($sessionId) {
        return $this->db->selectOne(
            'SELECT * FROM game_sessions WHERE id = :id',
            ['id' => $sessionId]
        );
    }

    /**
     * Crea nuova sessione di gioco
     *
     * @param int $playerId
     * @param string $sessionName
     * @param int $startYear
     * @return int|false session_id
     */
    public function createSession($playerId, $sessionName = 'New Game', $startYear = 2100) {
        return $this->db->insert(
            'INSERT INTO game_sessions
             (player_id, session_name, game_start_year, current_game_year, real_start_time, last_update)
             VALUES (:player_id, :session_name, :start_year, :start_year, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
            [
                'player_id' => $playerId,
                'session_name' => $sessionName,
                'start_year' => $startYear
            ]
        );
    }

    /**
     * Pausa/Riprendi sessione
     *
     * @param int $sessionId
     * @param bool $pause
     * @return bool
     */
    public function togglePause($sessionId, $pause = true) {
        // Se mettiamo in pausa, prima aggiorniamo il tempo
        if ($pause) {
            $this->updateGameTime($sessionId);
        }

        $affected = $this->db->update(
            'UPDATE game_sessions
             SET is_paused = :is_paused,
                 last_update = CURRENT_TIMESTAMP
             WHERE id = :session_id',
            [
                'is_paused' => $pause ? 1 : 0,
                'session_id' => $sessionId
            ]
        );

        return $affected > 0;
    }

    /**
     * Log aggiornamento tempo nel tracker
     *
     * @param int $sessionId
     * @param float $gameYear
     */
    private function logTimeUpdate($sessionId, $gameYear) {
        $dayOfYear = floor(($gameYear - floor($gameYear)) * 365.25);

        $this->db->insert(
            'INSERT INTO time_tracker
             (session_id, game_year, game_day, real_timestamp)
             VALUES (:session_id, :game_year, :game_day, CURRENT_TIMESTAMP)',
            [
                'session_id' => $sessionId,
                'game_year' => $gameYear,
                'game_day' => $dayOfYear
            ]
        );
    }

    /**
     * Converti tempo reale in tempo di gioco
     *
     * @param int $realSeconds
     * @return float anni di gioco
     */
    public static function realToGameTime($realSeconds) {
        return $realSeconds * self::TIME_SCALE;
    }

    /**
     * Converti tempo di gioco in tempo reale
     *
     * @param float $gameYears
     * @return int secondi reali
     */
    public static function gameToRealTime($gameYears) {
        return (int)($gameYears / self::TIME_SCALE);
    }

    /**
     * Formatta anno di gioco per display
     *
     * @param float $gameYear
     * @return array
     */
    public static function formatGameYear($gameYear) {
        $year = floor($gameYear);
        $fraction = $gameYear - $year;
        $dayOfYear = floor($fraction * 365.25) + 1;

        // Check if leap year (Gregorian calendar)
        // Leap if divisible by 4, except centuries unless divisible by 400
        $isLeapYear = ($year % 4 == 0 && $year % 100 != 0) || ($year % 400 == 0);

        // Calcola mese approssimativo (with leap year support)
        $daysInMonth = [
            31,                          // January
            $isLeapYear ? 29 : 28,      // February (29 in leap years)
            31,                          // March
            30,                          // April
            31,                          // May
            30,                          // June
            31,                          // July
            31,                          // August
            30,                          // September
            31,                          // October
            30,                          // November
            31                           // December
        ];

        $month = 0;
        $day = $dayOfYear;

        while ($month < 12 && $day > $daysInMonth[$month]) {
            $day -= $daysInMonth[$month];
            $month++;
        }

        return [
            'year' => $year,
            'month' => $month + 1,
            'day' => $day,
            'day_of_year' => $dayOfYear,
            'is_leap_year' => $isLeapYear,
            'formatted' => sprintf('Year %d, Day %d', $year, $dayOfYear)
        ];
    }
}
?>
