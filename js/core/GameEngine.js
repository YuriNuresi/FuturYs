/**
 * FUTURY - Game Engine Core
 * Manages game state, resources, time, and game logic
 * @version 1.0.0
 */

import { TimeManager } from './TimeManager.js';
import { ResourceManager } from './ResourceManager.js';
import { MissionManager } from './MissionManager.js';

export class GameEngine {
    constructor(nation, apiClient) {
        this.nation = nation;
        this.apiClient = apiClient;
        
        // Core managers
        this.timeManager = new TimeManager();
        this.resourceManager = new ResourceManager(nation);
        this.missionManager = new MissionManager();
        
        // Game state
        this.state = {
            initialized: false,
            sessionId: null,
            playerId: null,
            year: 2100,
            isPaused: false
        };
        
        // Callbacks
        this.onStateUpdate = null;
        this.onMissionComplete = null;
        
        // Update tracking
        this.lastUpdate = 0;
        this.updateInterval = 1000; // Update every second
    }
    
    async init() {
        console.log(`🎮 Initializing Game Engine for ${this.nation}`);
        
        try {
            // Try to load existing session or create new one
            const session = await this.loadOrCreateSession();
            
            if (session) {
                this.state.sessionId = session.id;
                this.state.playerId = session.player_id;
                this.state.year = session.current_game_year;
                
                // Initialize managers with session data
                this.timeManager.init(session.game_start_year, session.current_game_year);
                this.resourceManager.loadResources(session.resources || {});
                
                console.log('📦 Loaded existing session:', session.id);
            } else {
                // Create new session
                await this.createNewSession();
            }
            
            this.state.initialized = true;
            
            // Start auto-save
            this.startAutoSave();
            
            return true;
            
        } catch (error) {
            console.error('Failed to initialize game engine:', error);
            throw error;
        }
    }
    
    async loadOrCreateSession() {
        try {
            // Try to get active session from API
            const response = await this.apiClient.get('/api/session/active', {
                nation: this.nation
            });
            
            return response.data || null;
            
        } catch (error) {
            console.log('No active session found, will create new one');
            return null;
        }
    }
    
    async createNewSession() {
        console.log('🆕 Creating new game session');
        
        // Get nation data
        const nationData = await this.getNationData();
        
        // Initialize resources based on nation
        this.resourceManager.initializeResources(nationData);
        
        // Set starting year
        this.state.year = 2100;
        this.timeManager.init(2100, 2100);
        
        // Save initial session to backend
        try {
            const response = await this.apiClient.post('/api/session/create', {
                nation: this.nation,
                start_year: 2100,
                resources: this.resourceManager.getAll()
            });
            
            this.state.sessionId = response.data.session_id;
            this.state.playerId = response.data.player_id;
            
            console.log('✅ Session created:', this.state.sessionId);
            
        } catch (error) {
            console.warn('Could not save session to backend, using local storage');
            // Fallback to local storage
            this.state.sessionId = 'local_' + Date.now();
        }
    }
    
    async getNationData() {
        try {
            const response = await this.apiClient.get('/api/nations/' + this.nation);
            return response.data;
        } catch (error) {
            console.warn('Using default nation data');
            return this.getDefaultNationData();
        }
    }
    
    getDefaultNationData() {
        const defaults = {
            'USA': { 
                budget: 1200000, 
                science: 12000, 
                population: 330000000,
                budgetMultiplier: 1.2,
                scienceMultiplier: 1.0
            },
            'China': { 
                budget: 1000000, 
                science: 10000, 
                population: 1400000000,
                budgetMultiplier: 1.0,
                scienceMultiplier: 1.0
            },
            'Russia': { 
                budget: 1000000, 
                science: 11000, 
                population: 144000000,
                budgetMultiplier: 1.0,
                scienceMultiplier: 1.1
            },
            'ESA': { 
                budget: 1100000, 
                science: 10500, 
                population: 450000000,
                budgetMultiplier: 1.05,
                scienceMultiplier: 1.05
            }
        };
        
        return defaults[this.nation] || defaults['ESA'];
    }
    
    update(timestamp) {
        if (!this.state.initialized || this.state.isPaused) {
            return;
        }
        
        const deltaTime = timestamp - this.lastUpdate;
        
        if (deltaTime < this.updateInterval) {
            return;
        }
        
        this.lastUpdate = timestamp;
        
        // Update time
        this.timeManager.update();
        this.state.year = this.timeManager.getCurrentYear();
        
        // Update resources (passive generation)
        this.resourceManager.update(deltaTime);

        // Update missions
        const completedMissions = this.missionManager.update(this.state.year);
        
        // Handle completed missions
        completedMissions.forEach(mission => {
            this.onMissionComplete?.(mission);
        });
        
        // Notify UI of state changes
        if (this.onStateUpdate) {
            this.onStateUpdate(this.getState());
        }
    }
    
    async launchMission(missionData) {
        console.log('🚀 Launching mission:', missionData);

        // Get mission cost
        const cost = this.missionManager.getMissionCost(missionData.destination);

        // Check if can afford
        if (!this.resourceManager.canAfford(cost)) {
            console.warn('❌ Not enough resources for mission');
            return { success: false, error: 'Insufficient resources' };
        }

        // Use the core MissionManager's createMission which handles resource consumption
        const result = await this.missionManager.createMission(this.state.sessionId, {
            name: missionData.name || `Mission to ${missionData.destination}`,
            origin: missionData.origin || 'Earth',
            destination: missionData.destination,
            mission_type: missionData.type || 'EXPLORATION'
        });

        if (result.success) {
            console.log('✅ Mission launched successfully:', result.mission);
            return result;
        } else {
            console.warn('❌ Mission launch failed:', result.error);
            return result;
        }
    }
    getState() {
        return {
            year: this.state.year,
            resources: this.resourceManager.getAll(),
            missions: this.missionManager.getActiveMissions(),
            isPaused: this.state.isPaused
        };
    }
    
    pause() {
        this.state.isPaused = true;
    }
    
    resume() {
        this.state.isPaused = false;
    }
    
    startAutoSave() {
        // Auto-save every 5 minutes
        setInterval(() => {
            this.saveGame();
        }, 5 * 60 * 1000);
    }
    
    async saveGame() {
        console.log('💾 Auto-saving game...');
        
        try {
            await this.apiClient.post('/api/session/save', {
                session_id: this.state.sessionId,
                state: this.getState()
            });
            console.log('✅ Game saved');
        } catch (error) {
            console.warn('Could not save to backend, using localStorage');
            localStorage.setItem('futury_save_' + this.nation, JSON.stringify(this.getState()));
        }
    }
}
