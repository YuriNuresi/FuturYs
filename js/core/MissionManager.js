/**
 * FUTURY - Mission Manager (Client-side)
 * Gestisce missioni spaziali con tracking e notifiche
 * @version 1.0.0
 */

export class MissionManager {
    constructor() {
        this.missions = new Map();
        this.onMissionCompleteCallbacks = [];
        this.onMissionUpdateCallbacks = [];

        // Travel times (game years) - synced with server
        this.travelTimes = {
            'Earth-Moon': 0.003,
            'Earth-Mars': 0.12,
            'Earth-Jupiter': 0.25,
            'Earth-Saturn': 0.35,
            'Earth-Uranus': 0.50,
            'Earth-Neptune': 0.65
        };

        // Mission costs
        this.missionCosts = {
            'Moon': { budget: 100000, science: 500, energy: 50, materials: 10 },
            'Mars': { budget: 500000, science: 2000, energy: 200, materials: 50 },
            'Jupiter': { budget: 2000000, science: 10000, energy: 500, materials: 100 },
            'Saturn': { budget: 5000000, science: 25000, energy: 1000, materials: 200 },
            'Uranus': { budget: 10000000, science: 50000, energy: 2000, materials: 500 },
            'Neptune': { budget: 20000000, science: 100000, energy: 5000, materials: 1000 }
        };
    }

    /**
     * Initialize with existing missions
     */
    init(missions = []) {
        for (const mission of missions) {
            this.missions.set(mission.id, mission);
        }
        console.log(`🚀 MissionManager initialized with ${missions.length} missions`);
    }

    /**
     * Calculate travel time
     */
    getTravelTime(origin, destination) {
        const route = `${origin}-${destination}`;
        const reverse = `${destination}-${origin}`;
        return this.travelTimes[route] || this.travelTimes[reverse] || 0.1;
    }

    /**
     * Get mission cost
     */
    getMissionCost(destination) {
        return this.missionCosts[destination] || { budget: 1000000, science: 5000, energy: 100, materials: 20 };
    }

    /**
     * Calculate mission progress (0-1)
     */
    getMissionProgress(mission, currentYear) {
        if (currentYear <= mission.launch_year) return 0;
        if (currentYear >= mission.arrival_year) return 1;
        return (currentYear - mission.launch_year) / (mission.arrival_year - mission.launch_year);
    }

    /**
     * Update missions based on current game year
     */
    update(currentYear) {
        const completedMissions = [];

        for (const [id, mission] of this.missions) {
            if (mission.status === 'TRAVELING') {
                const progress = this.getMissionProgress(mission, currentYear);

                // Update progress
                mission.progress = progress;

                // Check if arrived
                if (currentYear >= mission.arrival_year && mission.status === 'TRAVELING') {
                    mission.status = 'ARRIVED';
                    completedMissions.push(mission);
                    this.notifyMissionComplete(mission);
                }

                this.notifyMissionUpdate(mission);
            }
        }

        return completedMissions;
    }

    /**
     * Add new mission
     */
    addMission(mission) {
        this.missions.set(mission.id, mission);
        console.log(`🚀 Mission created: ${mission.name} to ${mission.destination}`);
    }

    /**
     * Get active missions
     */
    getActiveMissions() {
        return Array.from(this.missions.values()).filter(m => m.status === 'TRAVELING');
    }

    /**
     * Get all missions
     */
    getAllMissions() {
        return Array.from(this.missions.values());
    }

    /**
     * Get mission by ID
     */
    getMission(id) {
        return this.missions.get(id);
    }

    /**
     * Register mission complete callback
     */
    onMissionComplete(callback) {
        this.onMissionCompleteCallbacks.push(callback);
    }

    /**
     * Register mission update callback
     */
    onMissionUpdate(callback) {
        this.onMissionUpdateCallbacks.push(callback);
    }

    /**
     * Notify mission complete
     */
    notifyMissionComplete(mission) {
        for (const callback of this.onMissionCompleteCallbacks) {
            callback(mission);
        }
    }

    /**
     * Notify mission update
     */
    notifyMissionUpdate(mission) {
        for (const callback of this.onMissionUpdateCallbacks) {
            callback(mission);
        }
    }

    /**
     * Format travel time for display
     */
    formatTravelTime(years) {
        const hours = years * 24;
        if (hours < 24) {
            return `${hours.toFixed(1)} hours`;
        } else {
            const days = hours / 24;
            return `${days.toFixed(1)} days`;
        }
    }

    /**
     * Create mission via API
     */
    async createMission(sessionId, missionData) {
        try {
            const response = await fetch('/php/api/missions.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: sessionId,
                    ...missionData
                })
            });

            const result = await response.json();

            if (result.success) {
                const mission = {
                    id: result.data.mission_id,
                    name: missionData.name,
                    origin: missionData.origin || 'Earth',
                    destination: missionData.destination,
                    status: 'TRAVELING',
                    launch_year: result.data.launch_year,
                    arrival_year: result.data.arrival_year,
                    travel_time_years: result.data.travel_time_years,
                    progress: 0
                };

                this.addMission(mission);
                return { success: true, mission };
            } else {
                return { success: false, error: result.error };
            }
        } catch (error) {
            console.error('Failed to create mission:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Sync with server
     */
    async syncWithServer(sessionId) {
        try {
            const response = await fetch(`/php/api/missions.php?session_id=${sessionId}`);
            const result = await response.json();

            if (result.success) {
                this.missions.clear();
                for (const mission of result.data.missions) {
                    this.missions.set(mission.id, mission);
                }
                console.log('✅ Missions synced with server');
                return true;
            }
        } catch (error) {
            console.error('❌ Mission sync failed:', error);
        }
        return false;
    }
}
