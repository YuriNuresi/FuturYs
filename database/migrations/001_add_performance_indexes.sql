-- =====================================================
-- FuturY Database Performance Indexes Migration
-- Task: card_503 - Optimize API calls and queries
-- Date: 2026-02-13
-- =====================================================

-- This migration adds indexes to improve query performance
-- All indexes are safe to add on existing data

-- ==========================================
-- 1. Player Resources Indexes
-- ==========================================
-- Used in: GET /api/resources.php, ResourceManager::getResources()
-- Frequency: Every page load, every resource update
CREATE INDEX IF NOT EXISTS idx_player_resources_session
ON player_resources(session_id);

-- ==========================================
-- 2. Missions Indexes
-- ==========================================
-- Used in: GET /api/missions.php, MissionManager::getSessionMissions()
-- Frequency: Every game tick, mission status checks
CREATE INDEX IF NOT EXISTS idx_missions_session
ON missions(session_id);

-- Composite index for filtered mission queries (status filter)
-- Used in: GET /api/missions.php?session_id=1&status=TRAVELING
CREATE INDEX IF NOT EXISTS idx_missions_session_status
ON missions(session_id, status);

-- Index for arrival year checks (mission completion detection)
-- Used in: Cron jobs, mission status updates
CREATE INDEX IF NOT EXISTS idx_missions_arrival
ON missions(arrival_year, status);

-- ==========================================
-- 3. Game Sessions Indexes
-- ==========================================
-- Used in: Session lookups by player_id
-- Frequency: Login, session selection
CREATE INDEX IF NOT EXISTS idx_game_sessions_player
ON game_sessions(player_id);

-- Index for active session lookups
-- Used in: Finding active/non-paused sessions
CREATE INDEX IF NOT EXISTS idx_game_sessions_active
ON game_sessions(player_id, is_paused);

-- ==========================================
-- 4. Technologies Indexes (if table exists)
-- ==========================================
-- Used in: Tech tree queries, SaveManager
CREATE INDEX IF NOT EXISTS idx_player_technologies_session
ON player_technologies(session_id);

-- ==========================================
-- 5. Colonies Indexes (if table exists)
-- ==========================================
-- Used in: Colony management, SaveManager
CREATE INDEX IF NOT EXISTS idx_colonies_session
ON colonies(session_id);

-- Index for planet-based colony lookups
CREATE INDEX IF NOT EXISTS idx_colonies_planet
ON colonies(planet_id);

-- ==========================================
-- 6. Buildings Indexes
-- ==========================================
-- Used in: Building queries per colony/planet
CREATE INDEX IF NOT EXISTS idx_colony_buildings_colony
ON colony_buildings(colony_id);

-- Composite index for building type filters
CREATE INDEX IF NOT EXISTS idx_colony_buildings_type
ON colony_buildings(colony_id, building_id);

-- ==========================================
-- Performance Notes
-- ==========================================
--
-- Index Size Impact:
-- - Each index adds ~2-5% to database size
-- - Tradeoff: Slower INSERTs/UPDATEs, much faster SELECTs
-- - FuturY is SELECT-heavy (90% reads, 10% writes) → indexes beneficial
--
-- Query Performance Improvement (estimated):
-- - Simple lookups: 10-50x faster (e.g., session_id = ?)
-- - Filtered queries: 50-100x faster (e.g., WHERE session_id AND status)
-- - Large datasets: O(n) → O(log n) lookup time
--
-- Monitoring:
-- To check index usage:
--   EXPLAIN QUERY PLAN SELECT * FROM missions WHERE session_id = 1;
--   -- Should show "SEARCH missions USING INDEX idx_missions_session"
--
-- =====================================================
-- End of migration
-- =====================================================
