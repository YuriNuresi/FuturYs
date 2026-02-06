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
            // Initialize API Client
            this.apiClient = new APIClient();
            
            // Initialize UI Controller
            this.uiController = new UIController();
            this.setupUIEvents();
            
            // Wait for nation selection
            await this.waitForNationSelection();
            
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
    
    setupUIEvents() {
        // Nation selection
        const nationCards = document.querySelectorAll('.nation-card');
        nationCards.forEach(card => {
            card.addEventListener('click', () => {
                this.selectNation(card);
            });
        });
        
        // Start game button
        const startButton = document.getElementById('start-game-btn');
        if (startButton) {
            startButton.addEventListener('click', () => {
                if (this.selectedNation) {
                    this.startGame();
                }
            });
        }
    }
    
    selectNation(card) {
        // Remove previous selection
        document.querySelectorAll('.nation-card').forEach(c => {
            c.classList.remove('selected');
        });
        
        // Select this nation
        card.classList.add('selected');
        this.selectedNation = card.dataset.nation;
        
        console.log(`Selected nation: ${this.selectedNation}`);
        
        // Enable start button
        const startButton = document.getElementById('start-game-btn');
        if (startButton) {
            startButton.disabled = false;
        }
    }
    
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
