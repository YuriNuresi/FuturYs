<?php
/**
 * 🧪 FuturY - Backend Save/Load Test Script
 * Tests PHP SaveManager functionality
 * @version 1.0.0
 */

require_once __DIR__ . '/../php/core/SaveManager.php';
require_once __DIR__ . '/../php/config/database.php';

// ANSI Color codes for terminal output
class Color {
    const GREEN = "\033[32m";
    const RED = "\033[31m";
    const YELLOW = "\033[33m";
    const BLUE = "\033[34m";
    const RESET = "\033[0m";
    const BOLD = "\033[1m";
}

class SaveLoadTest {
    private $saveManager;
    private $db;
    private $testSessionId;
    private $passed = 0;
    private $failed = 0;
    private $total = 0;

    public function __construct() {
        $this->saveManager = new SaveManager();
        $this->db = getDB();
    }

    /**
     * Run all tests
     */
    public function runAllTests() {
        echo Color::BOLD . Color::BLUE . "\n";
        echo "╔══════════════════════════════════════════════════╗\n";
        echo "║  🧪 FuturY Backend Save/Load Test Suite         ║\n";
        echo "║  Testing PHP SaveManager (card_508)             ║\n";
        echo "╚══════════════════════════════════════════════════╝\n";
        echo Color::RESET . "\n";

        // Setup test session
        $this->setupTestSession();

        // Run test suites
        $this->testBasicOperations();
        $this->testDataIntegrity();
        $this->testEdgeCases();
        $this->testPerformance();

        // Cleanup
        $this->cleanup();

        // Print summary
        $this->printSummary();
    }

    /**
     * Setup test session
     */
    private function setupTestSession() {
        echo Color::YELLOW . "\n📦 Setting up test session...\n" . Color::RESET;

        try {
            // Create test player
            $playerId = $this->db->insert(
                "INSERT INTO players (username, email, created_at)
                 VALUES ('test_player', 'test@futury.test', datetime('now'))"
            );

            if (!$playerId) {
                throw new Exception("Failed to create test player");
            }

            // Create test session
            $this->testSessionId = $this->db->insert(
                "INSERT INTO game_sessions
                 (player_id, nation_id, session_name, game_start_year, current_game_year, real_start_time)
                 VALUES (:player_id, 1, 'Test Session', 2100.0, 2100.0, datetime('now'))",
                ['player_id' => $playerId]
            );

            if (!$this->testSessionId) {
                throw new Exception("Failed to create test session");
            }

            // Create test resources
            $result = $this->db->insert(
                "INSERT INTO player_resources
                 (session_id, budget, science_points, population, energy, materials, food, water, oxygen)
                 VALUES (:sid, 1000000, 10000, 300000000, 50000, 40000, 30000, 20000, 10000)",
                ['sid' => $this->testSessionId]
            );

            if (!$result) {
                throw new Exception("Failed to create test resources");
            }

            echo Color::GREEN . "✅ Test session created (ID: {$this->testSessionId})\n" . Color::RESET;

        } catch (Exception $e) {
            echo Color::RED . "❌ Failed to setup test session: " . $e->getMessage() . "\n" . Color::RESET;
            exit(1);
        }
    }

    /**
     * Test basic save/load operations
     */
    private function testBasicOperations() {
        echo Color::BLUE . "\n━━━ 1. Basic Operations ━━━\n" . Color::RESET;

        // Test 1.1: Save game state
        $this->test('Save game state', function() {
            $result = $this->saveManager->saveGameState($this->testSessionId);
            return $result['success'] === true;
        });

        // Test 1.2: Load game state
        $this->test('Load game state', function() {
            $result = $this->saveManager->getGameState($this->testSessionId);
            return $result['success'] === true && isset($result['game_state']);
        });

        // Test 1.3: Get save info
        $this->test('Get save info', function() {
            $result = $this->saveManager->getSaveInfo($this->testSessionId);
            return $result['success'] === true && $result['has_save'] === true;
        });

        // Test 1.4: Auto-save
        $this->test('Auto-save functionality', function() {
            $result = $this->saveManager->autoSave($this->testSessionId);
            return $result['success'] === true;
        });
    }

    /**
     * Test data integrity
     */
    private function testDataIntegrity() {
        echo Color::BLUE . "\n━━━ 2. Data Integrity ━━━\n" . Color::RESET;

        // Test 2.1: Save and verify year
        $this->test('Year persistence', function() {
            // Update year
            $this->db->update(
                "UPDATE game_sessions SET current_game_year = 2150.5 WHERE id = :id",
                ['id' => $this->testSessionId]
            );

            $this->saveManager->saveGameState($this->testSessionId);
            $result = $this->saveManager->getGameState($this->testSessionId);

            return abs($result['game_state']['session']['current_game_year'] - 2150.5) < 0.01;
        });

        // Test 2.2: Save and verify resources
        $this->test('Resource persistence', function() {
            // Update resources
            $this->db->update(
                "UPDATE player_resources SET budget = 1500000, science_points = 25000 WHERE session_id = :id",
                ['id' => $this->testSessionId]
            );

            $this->saveManager->saveGameState($this->testSessionId);
            $result = $this->saveManager->getGameState($this->testSessionId);

            return $result['game_state']['resources']['budget'] === 1500000 &&
                   $result['game_state']['resources']['science_points'] === 25000;
        });

        // Test 2.3: Save and verify missions
        $this->test('Mission persistence', function() {
            // Create test mission
            $this->db->insert(
                "INSERT INTO missions
                 (session_id, mission_name, origin_planet, destination_planet, status, launch_year, arrival_year, travel_time_years, mission_type)
                 VALUES (:sid, 'Test Mars Mission', 'Earth', 'Mars', 'TRAVELING', 2100.0, 2102.5, 2.5, 'EXPLORATION')",
                ['sid' => $this->testSessionId]
            );

            $this->saveManager->saveGameState($this->testSessionId);
            $result = $this->saveManager->getGameState($this->testSessionId);

            return count($result['game_state']['missions']) === 1 &&
                   $result['game_state']['missions'][0]['destination'] === 'Mars';
        });

        // Test 2.4: JSON encoding integrity
        $this->test('JSON encoding integrity', function() {
            $result = $this->saveManager->saveGameState($this->testSessionId);

            // Retrieve save_data directly
            $saveData = $this->db->selectOne(
                "SELECT save_data FROM game_sessions WHERE id = :id",
                ['id' => $this->testSessionId]
            );

            // Verify it's valid JSON
            $decoded = json_decode($saveData['save_data'], true);
            return $decoded !== null && json_last_error() === JSON_ERROR_NONE;
        });
    }

    /**
     * Test edge cases
     */
    private function testEdgeCases() {
        echo Color::BLUE . "\n━━━ 3. Edge Cases ━━━\n" . Color::RESET;

        // Test 3.1: Non-existent session
        $this->test('Non-existent session handling', function() {
            $result = $this->saveManager->getGameState(99999);
            return $result['success'] === false;
        });

        // Test 3.2: Empty missions
        $this->test('Empty missions handling', function() {
            // Delete all missions
            $this->db->delete("DELETE FROM missions WHERE session_id = :id", ['id' => $this->testSessionId]);

            $result = $this->saveManager->getGameState($this->testSessionId);
            return $result['success'] === true && is_array($result['game_state']['missions']) && count($result['game_state']['missions']) === 0;
        });

        // Test 3.3: Restore game state
        $this->test('Restore game state', function() {
            $mockState = [
                'session' => [
                    'current_game_year' => 2175.0,
                    'is_paused' => true
                ],
                'resources' => [
                    'budget' => 2000000,
                    'science_points' => 50000,
                    'population' => 500000000,
                    'energy' => 100000,
                    'materials' => 80000,
                    'food' => 60000,
                    'water' => 40000,
                    'oxygen' => 30000
                ]
            ];

            $result = $this->saveManager->restoreGameState($this->testSessionId, $mockState);

            if (!$result['success']) {
                return false;
            }

            // Verify restoration
            $session = $this->db->selectOne("SELECT current_game_year FROM game_sessions WHERE id = :id", ['id' => $this->testSessionId]);
            $resources = $this->db->selectOne("SELECT budget FROM player_resources WHERE session_id = :id", ['id' => $this->testSessionId]);

            return abs($session['current_game_year'] - 2175.0) < 0.01 && $resources['budget'] == 2000000;
        });

        // Test 3.4: Load without save_data
        $this->test('Load without save_data', function() {
            // Clear save_data
            $this->db->update("UPDATE game_sessions SET save_data = NULL WHERE id = :id", ['id' => $this->testSessionId]);

            $result = $this->saveManager->loadGameState($this->testSessionId);
            return $result['success'] === false && isset($result['error']);
        });
    }

    /**
     * Test performance
     */
    private function testPerformance() {
        echo Color::BLUE . "\n━━━ 4. Performance ━━━\n" . Color::RESET;

        // Test 4.1: Save speed
        $this->test('Save operation speed (< 100ms)', function() {
            $start = microtime(true);
            $this->saveManager->saveGameState($this->testSessionId);
            $elapsed = (microtime(true) - $start) * 1000;

            echo Color::YELLOW . " ({$elapsed}ms)" . Color::RESET;
            return $elapsed < 100;
        });

        // Test 4.2: Load speed
        $this->test('Load operation speed (< 100ms)', function() {
            $start = microtime(true);
            $this->saveManager->getGameState($this->testSessionId);
            $elapsed = (microtime(true) - $start) * 1000;

            echo Color::YELLOW . " ({$elapsed}ms)" . Color::RESET;
            return $elapsed < 100;
        });

        // Test 4.3: Multiple consecutive saves
        $this->test('10 consecutive saves', function() {
            for ($i = 0; $i < 10; $i++) {
                $result = $this->saveManager->saveGameState($this->testSessionId);
                if (!$result['success']) {
                    return false;
                }
            }
            return true;
        });

        // Test 4.4: Large save data
        $this->test('Large save data (50 missions)', function() {
            // Create 50 missions
            for ($i = 0; $i < 50; $i++) {
                $this->db->insert(
                    "INSERT INTO missions (session_id, mission_name, origin_planet, destination_planet, status, launch_year, arrival_year, travel_time_years, mission_type)
                     VALUES (:sid, :name, 'Earth', 'Mars', 'TRAVELING', 2100.0, 2102.5, 2.5, 'EXPLORATION')",
                    ['sid' => $this->testSessionId, 'name' => "Mission $i"]
                );
            }

            $result = $this->saveManager->saveGameState($this->testSessionId);
            $loadResult = $this->saveManager->getGameState($this->testSessionId);

            return $result['success'] && count($loadResult['game_state']['missions']) === 50;
        });
    }

    /**
     * Helper: Run a single test
     */
    private function test($name, $callback) {
        $this->total++;

        try {
            $success = $callback();

            if ($success) {
                echo Color::GREEN . "  ✅ PASS: " . Color::RESET . $name . "\n";
                $this->passed++;
            } else {
                echo Color::RED . "  ❌ FAIL: " . Color::RESET . $name . "\n";
                $this->failed++;
            }

        } catch (Exception $e) {
            echo Color::RED . "  ❌ ERROR: " . Color::RESET . $name . " - " . $e->getMessage() . "\n";
            $this->failed++;
        }
    }

    /**
     * Cleanup test data
     */
    private function cleanup() {
        echo Color::YELLOW . "\n🧹 Cleaning up test data...\n" . Color::RESET;

        try {
            $this->db->delete("DELETE FROM missions WHERE session_id = :id", ['id' => $this->testSessionId]);
            $this->db->delete("DELETE FROM player_resources WHERE session_id = :id", ['id' => $this->testSessionId]);
            $this->db->delete("DELETE FROM game_sessions WHERE id = :id", ['id' => $this->testSessionId]);
            $this->db->delete("DELETE FROM players WHERE username = 'test_player'");

            echo Color::GREEN . "✅ Cleanup complete\n" . Color::RESET;

        } catch (Exception $e) {
            echo Color::RED . "⚠️  Cleanup failed: " . $e->getMessage() . "\n" . Color::RESET;
        }
    }

    /**
     * Print test summary
     */
    private function printSummary() {
        $percentage = ($this->total > 0) ? round(($this->passed / $this->total) * 100, 1) : 0;

        echo "\n";
        echo Color::BOLD . "═══════════════════════════════════════════════════\n";
        echo "                 📊 TEST SUMMARY\n";
        echo "═══════════════════════════════════════════════════\n" . Color::RESET;
        echo "  Total Tests:   " . Color::BOLD . $this->total . Color::RESET . "\n";
        echo "  " . Color::GREEN . "Passed:        " . $this->passed . Color::RESET . "\n";
        echo "  " . Color::RED . "Failed:        " . $this->failed . Color::RESET . "\n";
        echo "  " . Color::BLUE . "Success Rate:  {$percentage}%" . Color::RESET . "\n";
        echo Color::BOLD . "═══════════════════════════════════════════════════\n" . Color::RESET;

        if ($this->failed === 0) {
            echo Color::GREEN . Color::BOLD . "\n  🎉 ALL TESTS PASSED! 🎉\n" . Color::RESET;
        } else {
            echo Color::RED . "\n  ⚠️  SOME TESTS FAILED\n" . Color::RESET;
        }

        echo "\n";
    }
}

// Run tests
$tester = new SaveLoadTest();
$tester->runAllTests();
?>
