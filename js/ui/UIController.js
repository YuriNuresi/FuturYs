/**
 * 🎮 UIController - Main UI orchestrator (card_712)
 * Manages planet panel, mission interactions, and layout state
 */
export class UIController {
    constructor() {
        this.onLaunchMission = null;
        this.onMissionClick = null;
        this.onToggleTrajectories = null;
        this.planetPanel = null;
        this.closeBtn = null;
        this._initPlanetPanel();
        this._initMissionPanel();
        this._initKeyboardShortcuts();
    }

    showLoading(text) {
        console.log('[UIController] Loading:', text);
    }

    hideLoading() {
        console.log('[UIController] Loading hidden');
    }

    _initPlanetPanel() {
        this.planetPanel = document.getElementById('planet-info-panel');
        this.closeBtn = document.getElementById('close-panel');

        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.hidePlanetInfo());
        }

        // Close planet panel on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.planetPanel && !this.planetPanel.classList.contains('hidden')) {
                this.hidePlanetInfo();
            }
        });
    }

    showPlanetInfo(data) {
        if (!this.planetPanel) return;

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

        this.planetPanel.classList.remove('hidden');
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
        const yearEl = document.getElementById('game-year');
        const dateEl = document.getElementById('game-date');
        if (yearEl && state.year) yearEl.textContent = state.year;
        if (dateEl && state.date) dateEl.textContent = state.date;
    }

    showNotification(message, type) {
        console.log(`[UIController][${type}] ${message}`);
    }

    format(num) {
        if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
        return Math.round(num);
    }

    _initMissionPanel() {
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

    setupMissionClickHandlers() {
        const missionElements = document.querySelectorAll('.mission-item');
        missionElements.forEach(el => {
            el.style.cursor = 'pointer';
            el.addEventListener('click', () => {
                const missionId = parseInt(el.dataset.missionId);
                if (this.onMissionClick && missionId) {
                    this.onMissionClick(missionId);

                    document.querySelectorAll('.mission-item').forEach(m => {
                        m.classList.remove('selected');
                    });
                    el.classList.add('selected');
                }
            });
        });
    }

    /**
     * Switch active nav tab programmatically
     */
    switchNavTab(viewName) {
        const btn = document.querySelector(`.nav-btn[data-view="${viewName}"]`);
        if (btn) btn.click();
    }

    /**
     * Switch active dock tab programmatically
     */
    switchDockTab(tabName) {
        const tab = document.querySelector(`.dock__tab[data-dock-tab="${tabName}"]`);
        if (tab) tab.click();
    }

    /**
     * Toggle sidebar collapsed state
     */
    toggleSidebar() {
        const appContainer = document.getElementById('app-container');
        if (appContainer) {
            appContainer.classList.toggle('sidebar-collapsed');
            localStorage.setItem('futury-sidebar-collapsed', appContainer.classList.contains('sidebar-collapsed'));
        }
    }

    /**
     * Keyboard shortcuts
     */
    _initKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Don't capture when typing in inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            switch (e.key) {
                case '1': this.switchNavTab('solar-system'); break;
                case '2': this.switchNavTab('missions'); break;
                case '3': this.switchNavTab('buildings'); break;
                case '4': this.switchNavTab('research'); break;
                case '5': this.switchNavTab('economy'); break;
                case 'b': if (e.ctrlKey || e.metaKey) { e.preventDefault(); this.toggleSidebar(); } break;
            }
        });
    }
}
