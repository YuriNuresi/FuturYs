export class UIController {
    constructor() {
        this.onLaunchMission = null;
    }
    
    showLoading(text) {
        console.log('Loading:', text);
    }
    
    hideLoading() {
        console.log('Loading hidden');
    }
    
    showPlanetInfo(data) {
        console.log('Planet info:', data);
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
}
