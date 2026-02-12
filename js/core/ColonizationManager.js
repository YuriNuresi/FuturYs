/**
 * FUTURY - Colonization Manager
 * Manages planet colonization status and unlocks
 * @version 1.0.0
 *
 * Created for card_405: Enable colonization after mission
 */

export class ColonizationManager {
    constructor() {
        // Track colonization status for each planet
        this.colonizedPlanets = new Map();
        this.exploredPlanets = new Set();
        this.onColonizationChangeCallbacks = [];

        // Earth is always colonized by default
        this.colonizedPlanets.set('Earth', {
            colonized: true,
            colonizationDate: null,
            population: 0,
            buildings: [],
            canBuild: true,
            canColonize: false // Already colonized
        });
    }

    /**
     * Initialize with saved colonization data
     */
    init(savedData = {}) {
        if (savedData.colonizedPlanets) {
            for (const [planet, data] of Object.entries(savedData.colonizedPlanets)) {
                this.colonizedPlanets.set(planet, data);
            }
        }

        if (savedData.exploredPlanets) {
            this.exploredPlanets = new Set(savedData.exploredPlanets);
        }

        console.log(`🏛️ ColonizationManager initialized: ${this.colonizedPlanets.size} colonized planets, ${this.exploredPlanets.size} explored`);
    }

    /**
     * Mark planet as explored when mission arrives
     */
    markPlanetExplored(planetName, currentYear) {
        if (!this.exploredPlanets.has(planetName)) {
            this.exploredPlanets.add(planetName);
            console.log(`🔍 ${planetName} explored in year ${currentYear}`);
            this.notifyChange();
            return true;
        }
        return false;
    }

    /**
     * Check if planet can be colonized
     */
    canColonize(planetName) {
        // Planet must be explored first
        if (!this.exploredPlanets.has(planetName)) {
            return { can: false, reason: 'Planet must be explored first' };
        }

        // Check if already colonized
        const colonization = this.colonizedPlanets.get(planetName);
        if (colonization?.colonized) {
            return { can: false, reason: 'Planet already colonized' };
        }

        // Colonizable planets (for MVP)
        const colonizablePlanets = ['Mars', 'Moon'];
        if (!colonizablePlanets.includes(planetName)) {
            return { can: false, reason: `${planetName} cannot be colonized in current version` };
        }

        return { can: true };
    }

    /**
     * Colonize a planet after mission completion
     */
    colonizePlanet(planetName, currentYear, initialPopulation = 50) {
        const canColonize = this.canColonize(planetName);

        if (!canColonize.can) {
            console.warn(`Cannot colonize ${planetName}: ${canColonize.reason}`);
            return { success: false, error: canColonize.reason };
        }

        // Create colonization record
        const colonizationData = {
            colonized: true,
            colonizationDate: currentYear,
            population: initialPopulation,
            buildings: [],
            canBuild: true,
            canColonize: false
        };

        this.colonizedPlanets.set(planetName, colonizationData);

        console.log(`🏛️ ${planetName} colonized in year ${currentYear}! Population: ${initialPopulation}`);

        this.notifyChange();

        return {
            success: true,
            colonization: colonizationData,
            message: `${planetName} successfully colonized!`
        };
    }

    /**
     * Handle mission completion - auto-explore and optionally colonize
     */
    handleMissionCompletion(mission, currentYear) {
        const planetName = mission.destination;

        // Mark as explored
        const newlyExplored = this.markPlanetExplored(planetName, currentYear);

        // Auto-colonize for colonization missions
        if (mission.mission_type === 'COLONIZATION') {
            const colonizationResult = this.colonizePlanet(planetName, currentYear, 50);

            return {
                explored: true,
                newlyExplored,
                colonized: colonizationResult.success,
                colonization: colonizationResult.colonization,
                unlocks: {
                    canBuild: true,
                    canProduceResources: true
                }
            };
        }

        // For exploration missions, just mark as explored
        return {
            explored: true,
            newlyExplored,
            colonized: false,
            unlocks: {
                canLaunchColonizationMission: true
            }
        };
    }

    /**
     * Check if planet is colonized
     */
    isColonized(planetName) {
        const data = this.colonizedPlanets.get(planetName);
        return data?.colonized || false;
    }

    /**
     * Check if planet is explored
     */
    isExplored(planetName) {
        return this.exploredPlanets.has(planetName);
    }

    /**
     * Get colonization data for a planet
     */
    getColonizationData(planetName) {
        return this.colonizedPlanets.get(planetName);
    }

    /**
     * Check if can build on planet
     */
    canBuildOnPlanet(planetName) {
        const data = this.colonizedPlanets.get(planetName);
        return data?.canBuild || false;
    }

    /**
     * Get all colonized planets
     */
    getColonizedPlanets() {
        return Array.from(this.colonizedPlanets.keys()).filter(
            planet => this.colonizedPlanets.get(planet).colonized
        );
    }

    /**
     * Get all explored but not colonized planets
     */
    getExploredPlanets() {
        return Array.from(this.exploredPlanets).filter(
            planet => !this.isColonized(planet)
        );
    }

    /**
     * Get colonization status for display
     */
    getColonizationStatus(planetName) {
        if (this.isColonized(planetName)) {
            const data = this.colonizedPlanets.get(planetName);
            return {
                status: 'COLONIZED',
                icon: '🏛️',
                color: '#4fd1c7',
                description: `Colonized since year ${data.colonizationDate || 'N/A'}`,
                population: data.population,
                canBuild: data.canBuild
            };
        } else if (this.isExplored(planetName)) {
            return {
                status: 'EXPLORED',
                icon: '🔍',
                color: '#FFB84D',
                description: 'Explored - Ready for colonization',
                canBuild: false
            };
        } else {
            return {
                status: 'UNEXPLORED',
                icon: '❓',
                color: '#888',
                description: 'Not yet explored',
                canBuild: false
            };
        }
    }

    /**
     * Register change callback
     */
    onColonizationChange(callback) {
        this.onColonizationChangeCallbacks.push(callback);
    }

    /**
     * Notify of colonization changes
     */
    notifyChange() {
        for (const callback of this.onColonizationChangeCallbacks) {
            callback({
                colonized: this.getColonizedPlanets(),
                explored: this.getExploredPlanets()
            });
        }
    }

    /**
     * Export data for saving
     */
    export() {
        return {
            colonizedPlanets: Object.fromEntries(this.colonizedPlanets),
            exploredPlanets: Array.from(this.exploredPlanets)
        };
    }

    /**
     * Get stats for display
     */
    getStats() {
        return {
            totalColonized: this.getColonizedPlanets().length,
            totalExplored: this.exploredPlanets.size,
            canExpandTo: this.getExploredPlanets().filter(p =>
                this.canColonize(p).can
            ).length
        };
    }
}
