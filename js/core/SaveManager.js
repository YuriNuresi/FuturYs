/**
 * FUTURY - Save Manager (Client-side)
 * Gestisce salvataggio/caricamento stato di gioco
 * @version 1.0.0
 */

export class SaveManager {
    constructor() {
        this.sessionId = null;
        this.autoSaveInterval = null;
        this.autoSaveIntervalMs = 5 * 60 * 1000; // 5 minutes
        this.lastSaveTime = null;
        this.onSaveCallbacks = [];
        this.onLoadCallbacks = [];
    }

    /**
     * Initialize with session ID
     */
    init(sessionId) {
        this.sessionId = sessionId;
        console.log(`💾 SaveManager initialized for session ${sessionId}`);
    }

    /**
     * Start automatic save every 5 minutes
     */
    startAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }

        this.autoSaveInterval = setInterval(() => {
            this.autoSave();
        }, this.autoSaveIntervalMs);

        console.log('💾 Auto-save started (every 5 minutes)');
    }

    /**
     * Stop automatic save
     */
    stopAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
            console.log('💾 Auto-save stopped');
        }
    }

    /**
     * Build game state from managers
     */
    buildGameState(timeManager, resourceManager, missionManager) {
        return {
            version: '1.0.0',
            saved_at: new Date().toISOString(),
            session: {
                current_game_year: timeManager.getCurrentYearPrecise(),
                is_paused: timeManager.isPaused
            },
            resources: resourceManager.getState(),
            missions: missionManager.getAllMissions().map(m => ({
                id: m.id,
                name: m.name,
                origin: m.origin,
                destination: m.destination,
                status: m.status,
                launch_year: m.launch_year,
                arrival_year: m.arrival_year,
                progress: m.progress
            }))
        };
    }

    /**
     * Save game to server
     */
    async saveGame(gameState = null) {
        if (!this.sessionId) {
            console.error('No session ID set');
            return { success: false, error: 'No session ID' };
        }

        try {
            const response = await fetch('php/api/save.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: this.sessionId,
                    action: 'save',
                    game_state: gameState
                })
            });

            const result = await response.json();

            if (result.success) {
                this.lastSaveTime = new Date();
                this.notifySave(result.data);
                console.log('✅ Game saved successfully');
            }

            return result;
        } catch (error) {
            console.error('❌ Save failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Auto-save to server
     */
    async autoSave() {
        try {
            const response = await fetch('php/api/save.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: this.sessionId,
                    action: 'autosave'
                })
            });

            const result = await response.json();

            if (result.success) {
                this.lastSaveTime = new Date();
                console.log('💾 Auto-save completed at', result.data.saved_at);
            }

            return result;
        } catch (error) {
            console.error('❌ Auto-save failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Load game from server
     */
    async loadGame() {
        if (!this.sessionId) {
            return { success: false, error: 'No session ID' };
        }

        try {
            const response = await fetch(`php/api/save.php?session_id=${this.sessionId}&action=state`);
            const result = await response.json();

            if (result.success) {
                this.notifyLoad(result.data.game_state);
                console.log('✅ Game loaded successfully');
                return result.data.game_state;
            }

            return result;
        } catch (error) {
            console.error('❌ Load failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Apply loaded state to managers
     */
    applyGameState(gameState, timeManager, resourceManager, missionManager) {
        // Restore time
        if (gameState.session) {
            timeManager.init(
                gameState.session.game_start_year || 2100,
                gameState.session.current_game_year || 2100
            );
        }

        // Restore resources
        if (gameState.resources) {
            resourceManager.setState(gameState.resources);
        }

        // Restore missions
        if (gameState.missions) {
            missionManager.init(gameState.missions);
        }

        console.log('✅ Game state applied to managers');
    }

    /**
     * Get save info
     */
    async getSaveInfo() {
        try {
            const response = await fetch(`php/api/save.php?session_id=${this.sessionId}&action=info`);
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('❌ Failed to get save info:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Register save callback
     */
    onSave(callback) {
        this.onSaveCallbacks.push(callback);
    }

    /**
     * Register load callback
     */
    onLoad(callback) {
        this.onLoadCallbacks.push(callback);
    }

    /**
     * Notify save callbacks
     */
    notifySave(data) {
        for (const callback of this.onSaveCallbacks) {
            callback(data);
        }
    }

    /**
     * Notify load callbacks
     */
    notifyLoad(gameState) {
        for (const callback of this.onLoadCallbacks) {
            callback(gameState);
        }
    }

    /**
     * Get time since last save
     */
    getTimeSinceLastSave() {
        if (!this.lastSaveTime) return null;
        return Date.now() - this.lastSaveTime.getTime();
    }
}
