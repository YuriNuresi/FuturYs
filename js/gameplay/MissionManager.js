export class MissionManager {
    constructor(timeManager) {
        this.timeManager = timeManager;
        this.missions = [];
    }
    
    launch(data) {
        const mission = {
            id: Date.now(),
            target: data.target,
            type: data.type || 'exploration',
            status: 'traveling',
            launchTime: Date.now(),
            duration: this.calculateDuration(data.target),
            progress: 0
        };
        this.missions.push(mission);
        return mission;
    }
    
    calculateCost(data) {
        const costs = {
            'Mars': { budget: 150000, science: 3000 },
            'Jupiter': { budget: 300000, science: 5000 }
        };
        return costs[data.target] || { budget: 100000, science: 2000 };
    }
    
    calculateDuration(planet) {
        const times = {
            'Mars': 3 * 24 * 60 * 60 * 1000,
            'Jupiter': 6 * 24 * 60 * 60 * 1000
        };
        return times[planet] || 24 * 60 * 60 * 1000;
    }
    
    update(timestamp) {
        const completed = [];
        this.missions.forEach(m => {
            if (m.status === 'traveling') {
                m.progress = ((timestamp - m.launchTime) / m.duration) * 100;
                if (m.progress >= 100) {
                    m.status = 'arrived';
                    m.arrivalTime = timestamp;
                    completed.push(m);
                }
            }
        });
        return completed;
    }
    
    getActiveMissions() {
        return this.missions.filter(m => m.status !== 'completed');
    }
}
