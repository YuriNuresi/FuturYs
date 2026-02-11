/**
 * FUTURY - Resource Manager
 * Manages game resources (Budget, Science, Population, Energy, etc.)
 * @version 1.0.0
 */

export class ResourceManager {
    constructor(nation) {
        this.nation = nation;

        // Current resources
        this.resources = {
            budget: 0,
            science: 0,
            population: 0,
            energy: 0,
            materials: 0,
            food: 0,
            water: 0,
            oxygen: 0
        };

        // Resource metadata (icons, colors, units)
        this.resourcesInfo = {
            budget: { name: 'Budget', icon: '💰', unit: 'Credits', color: '#FFD700' },
            science: { name: 'Science', icon: '🔬', unit: 'Points', color: '#00CED1' },
            population: { name: 'Population', icon: '👥', unit: 'People', color: '#FF6B6B' },
            energy: { name: 'Energy', icon: '⚡', unit: 'Units', color: '#FFB84D' },
            materials: { name: 'Materials', icon: '⚙️', unit: 'Tons', color: '#A8A8A8' },
            food: { name: 'Food', icon: '🌾', unit: 'Tons', color: '#90EE90' },
            water: { name: 'Water', icon: '💧', unit: 'Liters', color: '#4FC3F7' },
            oxygen: { name: 'Oxygen', icon: '🫁', unit: 'Units', color: '#B0E0E6' }
        };

        // Change callbacks for UI updates
        this.onChangeCallbacks = [];
        
        // Production rates (per game year, calculated per second in real time)
        this.production = {
            budget: 0,
            science: 0,
            population: 0,
            energy: 0,
            materials: 0,
            food: 0,
            water: 0,
            oxygen: 0
        };
        
        // Multipliers from nation bonuses and buildings
        this.multipliers = {
            budget: 1.0,
            science: 1.0,
            population: 1.0,
            energy: 1.0,
            materials: 1.0,
            food: 1.0,
            water: 1.0,
            oxygen: 1.0
        };
    }
    
    initializeResources(nationData) {
        // Set starting resources based on nation
        this.resources.budget = nationData.budget || 1000000;
        this.resources.science = nationData.science || 10000;
        this.resources.population = nationData.population || 500000000;
        this.resources.energy = 1000;
        this.resources.materials = 500;
        this.resources.food = 1000;
        this.resources.water = 1000;
        this.resources.oxygen = 1000;
        
        // Set multipliers from nation bonuses
        this.multipliers.budget = nationData.budgetMultiplier || 1.0;
        this.multipliers.science = nationData.scienceMultiplier || 1.0;
        
        // Set base production rates
        this.setBaseProduction();
        
        console.log('💰 Resources initialized:', this.resources);
    }
    
    loadResources(savedResources) {
        this.resources = { ...this.resources, ...savedResources };
        console.log('📦 Resources loaded from save');
    }
    
    setBaseProduction() {
        // Base production per game year
        // Balanced for MVP: 24h real = 1 year game, Mars mission achievable in 2-3 days
        // Starting resources: $1M, 10K science, 500M population
        this.production = {
            budget: 250000,      // 250K per year (Mars mission $500K achievable in ~2 days)
            science: 1500,       // 1.5K per year (Mars needs 2K science, achievable in ~1.5 days)
            population: 0.02,    // 2% growth per year (doubles population in ~35 years)
            energy: 150,         // 150 per year (Mars needs 200 energy, ~1.5 days)
            materials: 120,      // 120 per year (balanced for building construction)
            food: 120,           // 120 per year (sustains population growth)
            water: 120,          // 120 per year (sustains population growth)
            oxygen: 100          // 100 per year (life support baseline)
        };
    }
    
    update(deltaTime) {
        // deltaTime is in milliseconds
        // Convert to fraction of game year
        const YEAR_IN_MS = 24 * 60 * 60 * 1000; // 24 hours
        const yearFraction = deltaTime / YEAR_IN_MS;
        
        // Update each resource
        for (const resource in this.production) {
            if (resource === 'population') {
                // Population grows exponentially
                const growthRate = this.production.population * this.multipliers.population;
                this.resources.population *= (1 + growthRate * yearFraction);
            } else {
                // Other resources grow linearly
                const productionAmount = this.production[resource] * this.multipliers[resource] * yearFraction;
                this.resources[resource] += productionAmount;
            }
        }
        
        // Round for display
        this.roundResources();
    }
    
    roundResources() {
        for (const resource in this.resources) {
            if (resource === 'population') {
                this.resources[resource] = Math.round(this.resources[resource]);
            } else {
                this.resources[resource] = Math.round(this.resources[resource] * 100) / 100;
            }
        }
    }
    
    get(resource) {
        return this.resources[resource] || 0;
    }
    
    getAll() {
        return { ...this.resources };
    }
    
    set(resource, amount) {
        if (this.resources.hasOwnProperty(resource)) {
            this.resources[resource] = Math.max(0, amount);
        }
    }
    
    add(resource, amount) {
        if (this.resources.hasOwnProperty(resource)) {
            const oldValue = this.resources[resource];
            this.resources[resource] += amount;
            this.resources[resource] = Math.max(0, this.resources[resource]);

            // Notify change
            this.notifyChanges({
                [resource]: {
                    old: oldValue,
                    new: this.resources[resource],
                    change: amount
                }
            });
        }
    }

    spend(costs) {
        // costs = { budget: 1000, science: 50, ... }
        const changes = {};

        for (const resource in costs) {
            if (this.resources.hasOwnProperty(resource)) {
                const oldValue = this.resources[resource];
                this.resources[resource] -= costs[resource];
                this.resources[resource] = Math.max(0, this.resources[resource]);

                changes[resource] = {
                    old: oldValue,
                    new: this.resources[resource],
                    change: -costs[resource]
                };
            }
        }

        // Notify all changes
        this.notifyChanges(changes);
    }
    
    canAfford(costs) {
        for (const resource in costs) {
            if (this.resources[resource] < costs[resource]) {
                return false;
            }
        }
        return true;
    }
    
    getProduction(resource) {
        return this.production[resource] * this.multipliers[resource];
    }
    
    setMultiplier(resource, multiplier) {
        if (this.multipliers.hasOwnProperty(resource)) {
            this.multipliers[resource] = multiplier;
        }
    }
    
    addMultiplier(resource, bonus) {
        if (this.multipliers.hasOwnProperty(resource)) {
            this.multipliers[resource] += bonus;
        }
    }
    
    /**
     * Format resource value for display
     */
    format(resource) {
        const value = this.resources[resource];
        
        if (resource === 'population') {
            // Format as billions/millions
            if (value >= 1000000000) {
                return (value / 1000000000).toFixed(2) + 'B';
            } else if (value >= 1000000) {
                return (value / 1000000).toFixed(2) + 'M';
            } else {
                return Math.round(value).toLocaleString();
            }
        } else {
            // Format as K/M for large numbers
            if (value >= 1000000) {
                return (value / 1000000).toFixed(2) + 'M';
            } else if (value >= 1000) {
                return (value / 1000).toFixed(1) + 'K';
            } else {
                return Math.round(value).toLocaleString();
            }
        }
    }
    
    /**
     * Get resource status (low/medium/high)
     */
    getStatus(resource) {
        const value = this.resources[resource];
        const production = this.getProduction(resource);

        // Simple heuristic based on production rate
        if (value < production * 10) return 'low';
        if (value < production * 100) return 'medium';
        return 'high';
    }

    /**
     * Format with icon and color
     */
    formatWithIcon(resource) {
        const info = this.resourcesInfo[resource];
        const value = this.format(resource);

        if (!info) return value;

        return {
            icon: info.icon,
            value: value,
            name: info.name,
            color: info.color,
            unit: info.unit
        };
    }

    /**
     * Get all resources formatted with metadata
     */
    getAllFormatted() {
        const formatted = {};

        for (const resource of Object.keys(this.resources)) {
            formatted[resource] = this.formatWithIcon(resource);
        }

        return formatted;
    }

    /**
     * Register callback for resource changes
     */
    onChange(callback) {
        this.onChangeCallbacks.push(callback);
    }

    /**
     * Notify all registered callbacks of changes
     */
    notifyChanges(changes) {
        for (const callback of this.onChangeCallbacks) {
            callback(changes);
        }
    }

    /**
     * Sync resources with server
     */
    async syncWithServer(sessionId) {
        try {
            const response = await fetch(`/php/api/resources.php?session_id=${sessionId}`);
            const data = await response.json();

            if (data.success) {
                const serverResources = {};

                for (const [key, info] of Object.entries(data.data.resources)) {
                    serverResources[key] = info.value;
                }

                this.resources = { ...this.resources, ...serverResources };

                if (data.data.production_rates) {
                    const rates = data.data.production_rates;
                    this.production.budget = rates.budget || this.production.budget;
                    this.production.science = rates.science_points || this.production.science;
                    this.production.population = rates.population || this.production.population;
                    this.production.energy = rates.energy || this.production.energy;
                }

                console.log('✅ Resources synced with server');
                return true;
            }
        } catch (error) {
            console.error('❌ Resource sync failed:', error);
        }

        return false;
    }

    /**
     * Get missing resources for costs
     */
    getMissingResources(costs) {
        const missing = {};

        for (const resource in costs) {
            const current = this.resources[resource] || 0;
            if (current < costs[resource]) {
                missing[resource] = costs[resource] - current;
            }
        }

        return missing;
    }

    /**
     * Consume resources (alias for spend with return value)
     */
    consume(costs) {
        if (!this.canAfford(costs)) {
            return {
                success: false,
                error: 'Insufficient resources',
                missing: this.getMissingResources(costs)
            };
        }

        this.spend(costs);
        return { success: true, consumed: costs };
    }
}
