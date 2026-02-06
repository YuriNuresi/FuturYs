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
        // Will be scaled to real time (24h real = 1 year game)
        this.production = {
            budget: 100000,      // 100K budget per year
            science: 1000,       // 1K science per year
            population: 0.01,    // 1% population growth per year
            energy: 100,         // 100 energy per year
            materials: 50,       // 50 materials per year
            food: 100,          // 100 food per year
            water: 100,         // 100 water per year
            oxygen: 100         // 100 oxygen per year
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
            this.resources[resource] += amount;
            this.resources[resource] = Math.max(0, this.resources[resource]);
        }
    }
    
    spend(costs) {
        // costs = { budget: 1000, science: 50, ... }
        for (const resource in costs) {
            if (this.resources.hasOwnProperty(resource)) {
                this.resources[resource] -= costs[resource];
                this.resources[resource] = Math.max(0, this.resources[resource]);
            }
        }
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
}
