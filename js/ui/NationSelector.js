/**
 * 🚀 FUTURY - NationSelector
 * Interactive world map for nation selection
 * @version 1.0.0
 */

export class NationSelector {
    constructor() {
        this.nations = [];
        this.selectedNation = null;
        this.onConfirm = null; // Callback function
        this.apiBasePath = 'php/api';
    }

    /**
     * Initialize the nation selector
     */
    async init() {
        console.log('[NationSelector] Initializing...');

        try {
            // 1. Load nations from API
            await this.loadNations();

            // 2. Load world map (SVG or grid fallback)
            await this.loadMap();

            // 3. Attach events to territories
            this.attachMapEvents();

            // 4. Setup confirm button
            this.setupConfirmButton();

            console.log('[NationSelector] Initialization complete');
        } catch (error) {
            console.error('[NationSelector] Initialization failed:', error);
            this.showError('Failed to load nation selector. Please refresh the page.');
        }
    }

    /**
     * Load nations data from API
     */
    async loadNations() {
        try {
            const response = await fetch(`${this.apiBasePath}/nations.php`);
            const result = await response.json();

            if (result.success) {
                this.nations = result.data;
                console.log(`[NationSelector] Loaded ${this.nations.length} nations`);
            } else {
                throw new Error(result.error || 'Failed to load nations');
            }
        } catch (error) {
            console.error('[NationSelector] API error:', error);
            // Fallback to hardcoded nations if API fails
            this.nations = this.getFallbackNations();
            console.warn('[NationSelector] Using fallback nation data');
        }
    }

    /**
     * Get fallback nation data if API fails
     */
    getFallbackNations() {
        return [
            { code: 'USA', name: 'USA', starting_budget: 2000000000, starting_science: 25000, starting_population: 350000000, specialization: 'SCIENCE', color_primary: '#1f4e79', description: 'Economic powerhouse with strong scientific research.' },
            { code: 'CHN', name: 'China', starting_budget: 1800000000, starting_science: 20000, starting_population: 1400000000, specialization: 'EXPANSION', color_primary: '#de2910', description: 'Largest population enables massive colonization efforts.' },
            { code: 'RUS', name: 'Russia', starting_budget: 1200000000, starting_science: 18000, starting_population: 145000000, specialization: 'ENERGY', color_primary: '#1c3578', description: 'Energy efficiency leader with strong scientific heritage.' },
            { code: 'ESA', name: 'ESA', starting_budget: 1500000000, starting_science: 30000, starting_population: 450000000, specialization: 'SCIENCE', color_primary: '#003399', description: 'International scientific collaboration at its finest.' }
        ];
    }

    /**
     * Load map visualization (grid fallback)
     */
    async loadMap() {
        const mapContainer = document.getElementById('world-map-container');

        if (!mapContainer) {
            throw new Error('Map container not found');
        }

        // Use grid layout (fallback, easy to implement)
        const gridHTML = this.createGridMap();
        mapContainer.innerHTML = gridHTML;

        console.log('[NationSelector] Map loaded (grid layout)');
    }

    /**
     * Create grid-based map layout
     */
    createGridMap() {
        const nationPositions = {
            'USA': { row: 2, col: 1, span: 2 },
            'CHN': { row: 2, col: 4, span: 1 },
            'RUS': { row: 1, col: 3, span: 2 },
            'ESA': { row: 2, col: 3, span: 1 },
            'IND': { row: 3, col: 4, span: 1 },
            'JPN': { row: 2, col: 5, span: 1 },
            'UAE': { row: 3, col: 3, span: 1 },
            'BRA': { row: 4, col: 2, span: 1 }
        };

        let html = '<div class="nation-grid">';

        this.nations.forEach(nation => {
            const pos = nationPositions[nation.code] || { row: 3, col: 3, span: 1 };
            const tier = ['USA', 'CHN', 'RUS', 'ESA', 'IND'].includes(nation.code) ? 'tier-1' : 'tier-2';
            const flag = this.getFlagEmoji(nation.code);

            html += `
                <div class="nation-cell ${tier}"
                     data-nation="${nation.code}"
                     style="grid-row: ${pos.row}; grid-column: ${pos.col} / span ${pos.span}; background: ${nation.color_primary}">
                    <span class="nation-flag">${flag}</span>
                    <span class="nation-name">${nation.name}</span>
                    <span class="nation-tier-badge">${tier === 'tier-1' ? '★' : '☆'}</span>
                </div>
            `;
        });

        html += '</div>';
        return html;
    }

    /**
     * Get flag emoji for nation code
     */
    getFlagEmoji(code) {
        const flags = {
            'USA': '🇺🇸',
            'CHN': '🇨🇳',
            'RUS': '🇷🇺',
            'ESA': '🇪🇺',
            'IND': '🇮🇳',
            'JPN': '🇯🇵',
            'UAE': '🇦🇪',
            'BRA': '🇧🇷'
        };
        return flags[code] || '🌍';
    }

    /**
     * Attach hover and click events to nation territories
     */
    attachMapEvents() {
        const territories = document.querySelectorAll('.nation-cell');

        territories.forEach(territory => {
            const nationCode = territory.dataset.nation;

            // Hover effects
            territory.addEventListener('mouseenter', () => {
                this.showNationTooltip(nationCode, territory);
            });

            territory.addEventListener('mouseleave', () => {
                this.hideNationTooltip();
            });

            // Click selection
            territory.addEventListener('click', () => {
                this.selectNation(nationCode);
            });

            // Touch support for mobile
            territory.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.selectNation(nationCode);
            });
        });

        console.log(`[NationSelector] Events attached to ${territories.length} territories`);
    }

    /**
     * Show nation stats tooltip on hover
     */
    showNationTooltip(nationCode, territoryElement) {
        const nation = this.nations.find(n => n.code === nationCode);
        if (!nation) return;

        const tooltip = document.getElementById('nation-tooltip');
        if (!tooltip) return;

        tooltip.innerHTML = `
            <h3 style="color: ${nation.color_primary}">${nation.name}</h3>
            <p class="nation-desc">${nation.description || 'No description available'}</p>
            <div class="stats-grid">
                <div class="stat">
                    <span class="stat-label">💰 Budget</span>
                    <span class="stat-value">${(nation.starting_budget / 1e9).toFixed(1)}B</span>
                </div>
                <div class="stat">
                    <span class="stat-label">🔬 Science</span>
                    <span class="stat-value">${(nation.starting_science / 1000).toFixed(0)}K</span>
                </div>
                <div class="stat">
                    <span class="stat-label">👥 Population</span>
                    <span class="stat-value">${(nation.starting_population / 1e6).toFixed(0)}M</span>
                </div>
                <div class="stat">
                    <span class="stat-label">⚡ Specialization</span>
                    <span class="stat-value">${nation.specialization || 'BALANCED'}</span>
                </div>
            </div>
        `;

        tooltip.classList.remove('hidden');
    }

    /**
     * Hide nation tooltip
     */
    hideNationTooltip() {
        const tooltip = document.getElementById('nation-tooltip');
        if (tooltip) {
            tooltip.classList.add('hidden');
        }
    }

    /**
     * Select a nation
     */
    selectNation(nationCode) {
        console.log(`[NationSelector] Nation selected: ${nationCode}`);

        // Remove previous selection
        document.querySelectorAll('.nation-cell').forEach(cell => {
            cell.classList.remove('selected');
        });

        // Select this territory
        const territory = document.querySelector(`[data-nation="${nationCode}"]`);
        if (territory) {
            territory.classList.add('selected');
        }

        this.selectedNation = nationCode;

        // Update UI
        const nation = this.nations.find(n => n.code === nationCode);
        if (nation) {
            const display = document.getElementById('selected-nation-display');
            if (display) {
                display.textContent = `Selected: ${nation.name}`;
                display.classList.remove('hidden');
            }
        }

        // Enable confirm button
        const confirmBtn = document.getElementById('confirm-nation-btn');
        if (confirmBtn) {
            confirmBtn.disabled = false;
        }
    }

    /**
     * Setup confirm button event
     */
    setupConfirmButton() {
        const confirmBtn = document.getElementById('confirm-nation-btn');
        if (!confirmBtn) {
            console.warn('[NationSelector] Confirm button not found');
            return;
        }

        confirmBtn.addEventListener('click', () => {
            if (this.selectedNation && this.onConfirm) {
                console.log(`[NationSelector] Confirming nation: ${this.selectedNation}`);
                this.onConfirm(this.selectedNation);
            } else {
                console.warn('[NationSelector] No nation selected or no callback set');
            }
        });
    }

    /**
     * Show error message
     */
    showError(message) {
        console.error(`[NationSelector] ${message}`);
        const mapContainer = document.getElementById('world-map-container');
        if (mapContainer) {
            mapContainer.innerHTML = `
                <div class="error-message">
                    <h3>⚠️ Error</h3>
                    <p>${message}</p>
                </div>
            `;
        }
    }
}
