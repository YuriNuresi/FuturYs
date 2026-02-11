export class UIController {
    constructor() {
        this.onLaunchMission = null;
        this.onMissionClick = null; // Callback for mission click
        this.onToggleTrajectories = null; // Callback for trajectory toggle
        this.planetPanel = null;
        this.closeBtn = null;
        this._initPlanetPanel();
        this._initMissionPanel();
    }

    showLoading(text) {
        console.log('Loading:', text);
    }

    hideLoading() {
        console.log('Loading hidden');
    }

    _initPlanetPanel() {
        // Get panel elements
        this.planetPanel = document.getElementById('planet-info-panel');
        this.closeBtn = document.getElementById('close-panel');

        // Add close button event listener
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.hidePlanetInfo());
        }
    }

    showPlanetInfo(data) {
        if (!this.planetPanel) {
            console.error('Planet panel not found');
            return;
        }

        // Populate panel with planet data
        this._setElementText('planet-name', data.name);
        this._setElementText('planet-description', data.description);
        this._setElementText('planet-type', data.type);
        this._setElementText('planet-mass', data.mass);
        this._setElementText('planet-diameter', data.diameter);
        this._setElementText('planet-moons', data.moons);
        this._setElementText('planet-distance-sun', data.distanceFromSun);
        this._setElementText('planet-distance-earth', data.distanceFromEarth);
        this._setElementText('planet-orbital-period', data.orbitalPeriod);
        this._setElementText('planet-travel-time', data.travelTime);

        // Show panel
        this.planetPanel.classList.remove('hidden');

        console.log('Planet info displayed:', data.name);
    }

    hidePlanetInfo() {
        if (this.planetPanel) {
            this.planetPanel.classList.add('hidden');
        }
    }

    _setElementText(id, text) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = text || 'N/A';
        }
    }
    
    updateGameState(state) {
        document.getElementById('current-year').textContent = state.year;
        document.getElementById('budget-value').textContent = this.format(state.resources.budget);
        document.getElementById('science-value').textContent = this.format(state.resources.science);
    }
    
    showNotification(message, type) {
        console.log(`[${type}] ${message}`);
    }
    
    format(num) {
        if (num >= 1000000) return (num/1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num/1000).toFixed(1) + 'K';
        return Math.round(num);
    }

    /**
     * Initialize mission panel controls
     */
    _initMissionPanel() {
        // Toggle trajectories button
        const toggleBtn = document.getElementById('toggle-trajectories-btn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                if (this.onToggleTrajectories) {
                    const visible = this.onToggleTrajectories();
                    toggleBtn.textContent = visible ? '👁️ Hide Trajectories' : '👁️‍🗨️ Show Trajectories';
                    toggleBtn.classList.toggle('active', visible);
                }
            });
        }
    }

    /**
     * Setup mission click handlers
     */
    setupMissionClickHandlers() {
        // This will be called after missions are rendered
        const missionElements = document.querySelectorAll('.mission-item');
        missionElements.forEach(el => {
            el.style.cursor = 'pointer';
            el.addEventListener('click', () => {
                const missionId = parseInt(el.dataset.missionId);
                if (this.onMissionClick && missionId) {
                    this.onMissionClick(missionId);

                    // Visual feedback
                    document.querySelectorAll('.mission-item').forEach(m => {
                        m.classList.remove('selected');
                    });
                    el.classList.add('selected');
                }
            });
        });
    }
}
