/**
 * 🏗️ FUTURY - Building Manager
 * Manages building construction, completion, and production effects
 * @version 1.0.0
 */

export class BuildingManager {
    constructor(resourceManager, timeManager) {
        this.resourceManager = resourceManager;
        this.timeManager = timeManager;

        this.availableBuildings = new Map(); // building_code → building data
        this.planetBuildings = new Map(); // planet_name → array of buildings
        this.constructionQueue = []; // Buildings currently being built

        this.onBuildingComplete = null; // Callback for building completion
    }

    /**
     * Initialize with building definitions from API or local data
     */
    async init() {
        try {
            // Try to load from API
            const response = await fetch('php/api/buildings.php');
            const result = await response.json();

            if (result.success) {
                result.data.forEach(building => {
                    building.effects = JSON.parse(building.effects_data || '{}');
                    this.availableBuildings.set(building.building_code, building);
                });
                console.log(`[BuildingManager] Loaded ${this.availableBuildings.size} building types`);
            }
        } catch (error) {
            console.warn('[BuildingManager] API failed, using fallback data');
            this.loadFallbackBuildings();
        }

        // Initialize Earth buildings
        if (!this.planetBuildings.has('Earth')) {
            this.planetBuildings.set('Earth', []);
        }
    }

    /**
     * Fallback building definitions
     */
    loadFallbackBuildings() {
        const fallbackBuildings = [
            {
                building_code: 'RESEARCH_CENTER',
                name: 'Research Center',
                category: 'RESEARCH',
                budget_cost: 500000,
                materials_cost: 200,
                energy_cost: 50,
                construction_time_years: 2.0,
                max_per_planet: 10,
                effects: {
                    science_production: 50,
                    research_speed_bonus: 0.1
                },
                description: 'Advanced research facility. Increases science production and speeds up technology research.'
            },
            {
                building_code: 'SPACE_PORT',
                name: 'Space Port',
                category: 'SPACEPORT',
                budget_cost: 1000000,
                materials_cost: 500,
                energy_cost: 100,
                construction_time_years: 3.0,
                max_per_planet: 3,
                effects: {
                    mission_cost_reduction: 0.15,
                    mission_capacity: 2,
                    launch_speed_bonus: 0.1
                },
                description: 'Orbital launch facility. Reduces mission costs and increases mission capacity.'
            },
            {
                building_code: 'ENERGY_PLANT',
                name: 'Energy Plant',
                category: 'PRODUCTION',
                budget_cost: 300000,
                materials_cost: 300,
                energy_cost: 0,
                construction_time_years: 2.0,
                max_per_planet: 15,
                effects: {
                    energy_production: 100,
                    efficiency_bonus: 0.05
                },
                description: 'Power generation facility. Produces energy for other buildings and operations.'
            },
            {
                building_code: 'FARM_COMPLEX',
                name: 'Farm Complex',
                category: 'PRODUCTION',
                budget_cost: 150000,
                materials_cost: 100,
                energy_cost: 30,
                construction_time_years: 1.0,
                max_per_planet: 20,
                effects: {
                    food_production: 50,
                    water_production: 30,
                    population_growth_bonus: 0.02
                },
                description: 'Agricultural complex. Produces food and water to sustain population.'
            }
        ];

        fallbackBuildings.forEach(building => {
            this.availableBuildings.set(building.building_code, building);
        });
    }

    /**
     * Get all available building types
     */
    getAvailableBuildings() {
        return Array.from(this.availableBuildings.values());
    }

    /**
     * Get buildings for a specific planet
     */
    getPlanetBuildings(planetName) {
        return this.planetBuildings.get(planetName) || [];
    }

    /**
     * Check if can build (resources, limits)
     */
    canBuild(buildingCode, planetName) {
        const building = this.availableBuildings.get(buildingCode);
        if (!building) {
            return { can: false, reason: 'Building type not found' };
        }

        // Check resource costs
        const costs = {
            budget: building.budget_cost,
            materials: building.materials_cost,
            energy: building.energy_cost
        };

        if (!this.resourceManager.canAfford(costs)) {
            return { can: false, reason: 'Insufficient resources' };
        }

        // Check planet limit
        const planetBuildings = this.getPlanetBuildings(planetName);
        const existingCount = planetBuildings.filter(b =>
            b.building_code === buildingCode &&
            (b.status === 'COMPLETED' || b.status === 'BUILDING')
        ).length;

        const maxPerPlanet = building.effects?.max_per_planet || building.max_per_planet || 99;

        if (existingCount >= maxPerPlanet) {
            return {
                can: false,
                reason: `Maximum ${maxPerPlanet} ${building.name} per planet`
            };
        }

        return { can: true };
    }

    /**
     * Start building construction
     */
    startConstruction(buildingCode, planetName) {
        const canBuildResult = this.canBuild(buildingCode, planetName);

        if (!canBuildResult.can) {
            return {
                success: false,
                error: canBuildResult.reason
            };
        }

        const building = this.availableBuildings.get(buildingCode);

        // Consume resources
        const costs = {
            budget: building.budget_cost,
            materials: building.materials_cost,
            energy: building.energy_cost
        };

        const consumeResult = this.resourceManager.consume(costs);

        if (!consumeResult.success) {
            return {
                success: false,
                error: 'Failed to consume resources'
            };
        }

        // Create building instance
        const currentYear = this.timeManager.getCurrentYear();
        const buildingInstance = {
            id: Date.now(), // Simple ID for now
            building_code: buildingCode,
            name: building.name,
            planet: planetName,
            status: 'BUILDING',
            construction_start_year: currentYear,
            construction_completion_year: currentYear + building.construction_time_years,
            construction_time_years: building.construction_time_years,
            progress: 0,
            effects: building.effects
        };

        // Add to planet buildings
        const planetBuildings = this.planetBuildings.get(planetName) || [];
        planetBuildings.push(buildingInstance);
        this.planetBuildings.set(planetName, planetBuildings);

        // Add to construction queue
        this.constructionQueue.push(buildingInstance);

        console.log(`[BuildingManager] Started construction: ${building.name} on ${planetName}`);
        console.log(`[BuildingManager] Completion in ${building.construction_time_years} years`);

        return {
            success: true,
            building: buildingInstance
        };
    }

    /**
     * Update construction progress
     */
    update(currentYear) {
        let completedBuildings = [];

        this.constructionQueue.forEach((building, index) => {
            if (building.status !== 'BUILDING') return;

            // Calculate progress
            const elapsed = currentYear - building.construction_start_year;
            const progress = Math.min(elapsed / building.construction_time_years, 1.0);
            building.progress = progress;

            // Check if completed
            if (progress >= 1.0) {
                building.status = 'COMPLETED';
                building.progress = 1.0;
                completedBuildings.push(building);

                console.log(`[BuildingManager] ✅ ${building.name} completed on ${building.planet}!`);

                // Trigger callback
                if (this.onBuildingComplete) {
                    this.onBuildingComplete(building);
                }
            }
        });

        // Remove completed from queue
        this.constructionQueue = this.constructionQueue.filter(b => b.status === 'BUILDING');

        return completedBuildings;
    }

    /**
     * Calculate total production bonuses from buildings
     */
    calculateProductionBonuses(planetName) {
        const planetBuildings = this.getPlanetBuildings(planetName);
        const completedBuildings = planetBuildings.filter(b => b.status === 'COMPLETED');

        const bonuses = {
            science_production: 0,
            energy_production: 0,
            food_production: 0,
            water_production: 0,
            mission_cost_reduction: 0,
            mission_capacity: 0,
            research_speed_bonus: 0,
            efficiency_bonus: 0,
            population_growth_bonus: 0,
            launch_speed_bonus: 0
        };

        completedBuildings.forEach(building => {
            Object.keys(building.effects).forEach(effect => {
                if (bonuses.hasOwnProperty(effect)) {
                    bonuses[effect] += building.effects[effect];
                }
            });
        });

        return bonuses;
    }

    /**
     * Apply production bonuses to resource manager
     */
    applyProductionBonuses() {
        const earthBonuses = this.calculateProductionBonuses('Earth');

        // Apply to resource manager production rates
        if (this.resourceManager && this.resourceManager.production) {
            this.resourceManager.production.science += earthBonuses.science_production;
            this.resourceManager.production.energy += earthBonuses.energy_production;
            this.resourceManager.production.food += earthBonuses.food_production;
            this.resourceManager.production.water += earthBonuses.water_production;
        }

        return earthBonuses;
    }

    /**
     * Get buildings in construction
     */
    getBuildingsInConstruction() {
        return this.constructionQueue;
    }

    /**
     * Get completed buildings count by type
     */
    getBuildingCount(buildingCode, planetName) {
        const planetBuildings = this.getPlanetBuildings(planetName);
        return planetBuildings.filter(b =>
            b.building_code === buildingCode && b.status === 'COMPLETED'
        ).length;
    }

    /**
     * Get building icon emoji
     */
    getBuildingIcon(buildingCode) {
        const icons = {
            'RESEARCH_CENTER': '🔬',
            'SPACE_PORT': '🚀',
            'ENERGY_PLANT': '⚡',
            'FARM_COMPLEX': '🌾'
        };
        return icons[buildingCode] || '🏗️';
    }
}
