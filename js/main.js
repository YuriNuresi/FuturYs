/**
 * FUTURY - Main Application Entry Point
 * Initializes the game and manages the main game loop
 * @version 1.0.0
 */

import { GameEngine } from './core/GameEngine.js';
import { SolarSystemRenderer } from './graphics/SolarSystemRenderer.js';
import { UIController } from './ui/UIController.js';
import { APIClient } from './api/APIClient.js';

class FuturY {
    constructor() {
        this.gameEngine = null;
        this.renderer = null;
        this.uiController = null;
        this.apiClient = null;
        this.selectedNation = null;
        this.isInitialized = false;
    }
    
    async init() {
        console.log('🚀 FuturY - Initializing Application...');

        try {
            // Get selected nation from URL parameter or sessionStorage
            this.selectedNation = this.getSelectedNation();

            if (!this.selectedNation) {
                throw new Error('No nation selected. Please select a nation from the main menu.');
            }

            console.log(`Starting game with nation: ${this.selectedNation}`);

            // Initialize API Client
            this.apiClient = new APIClient();

            // Initialize UI Controller
            this.uiController = new UIController();

            // Initialize Game Engine with selected nation
            this.gameEngine = new GameEngine(this.selectedNation, this.apiClient);
            await this.gameEngine.init();
            
            // Initialize 3D Solar System Renderer
            this.renderer = new SolarSystemRenderer('solar-system-canvas');
            await this.renderer.init();
            
            // Connect all systems
            this.connectSystems();
            
            // Start main game loop
            this.startGameLoop();
            
            this.isInitialized = true;
            console.log('✅ FuturY - Application Ready!');
            
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            this.showError('Errore di inizializzazione. Ricarica la pagina.');
        }
    }
    
    /**
     * Get selected nation from URL parameter or sessionStorage
     */
    getSelectedNation() {
        // Try URL parameter first
        const urlParams = new URLSearchParams(window.location.search);
        const nationFromURL = urlParams.get('nation');

        if (nationFromURL) {
            console.log(`Nation from URL: ${nationFromURL}`);
            return nationFromURL;
        }

        // Fallback to sessionStorage
        const nationFromStorage = sessionStorage.getItem('selectedNation');
        if (nationFromStorage) {
            console.log(`Nation from sessionStorage: ${nationFromStorage}`);
            return nationFromStorage;
        }

        console.warn('No nation selected');
        return null;
    }

    /**
     * Old method - kept for backwards compatibility but not used
     */
    waitForNationSelection() {
        return new Promise((resolve) => {
            this.resolveNationSelection = resolve;
        });
    }
    
    startGame() {
        // Hide welcome screen
        const welcomeScreen = document.getElementById('welcome-screen');
        if (welcomeScreen) {
            welcomeScreen.style.display = 'none';
        }
        
        // Show loading screen
        this.uiController.showLoading('Inizializzazione sistema solare...');
        
        // Resolve the promise to continue initialization
        if (this.resolveNationSelection) {
            this.resolveNationSelection();
        }
        
        // Hide loading after a moment
        setTimeout(() => {
            this.uiController.hideLoading();
            this.showGame();
        }, 2000);
    }
    
    showGame() {
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.style.display = 'block';
        }
    }
    
    connectSystems() {
        // Connect 3D renderer planet clicks to UI
        this.renderer.onPlanetClick = (planetData) => {
            this.uiController.showPlanetInfo(planetData);
        };
        
        // Connect UI mission launch to game engine
        this.uiController.onLaunchMission = (missionData) => {
            this.gameEngine.launchMission(missionData);
        };
        
        // Update UI when game state changes
        this.gameEngine.onStateUpdate = (state) => {
            this.uiController.updateGameState(state);
        };
        
        // Handle mission completion
        this.gameEngine.onMissionComplete = (mission) => {
            this.uiController.showNotification(
                `🎉 Missione completata: ${mission.target}`,
                'success'
            );
        };
    }
    
    startGameLoop() {
        const animate = (timestamp) => {
            requestAnimationFrame(animate);
            
            if (!this.isInitialized) return;
            
            // Update game engine (time, resources, missions)
            this.gameEngine.update(timestamp);
            
            // Render 3D solar system
            this.renderer.render();
        };
        
        requestAnimationFrame(animate);
    }
    
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <h2>⚠️ Errore</h2>
            <p>${message}</p>
            <button onclick="location.reload()">Ricarica Pagina</button>
        `;
        document.body.appendChild(errorDiv);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.futurY = new FuturY();
        window.futurY.init();
    });
} else {
    window.futurY = new FuturY();
    window.futurY.init();
}

// Export for external access
export default FuturY;
