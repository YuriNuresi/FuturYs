/**
 * FUTURY - Time Manager
 * Manages game time progression: 24h real = 1 year game
 * @version 1.0.0
 */

export class TimeManager {
    constructor() {
        this.startYear = 2100;
        this.currentYear = 2100;
        this.startRealTime = null;
        this.pausedTime = 0;
        this.isPaused = false;
        
        // Time scale: 24 hours real = 1 year game = 365.25 days
        // 86400 seconds real = 1 year game
        // 1 second real = 1/86400 year ≈ 0.0000115740 year
        this.SECONDS_PER_YEAR = 86400; // 24 hours
        this.timeScale = 1 / this.SECONDS_PER_YEAR;
    }
    
    init(startYear = 2100, currentYear = 2100) {
        // Validate input
        if (typeof startYear !== 'number' || typeof currentYear !== 'number') {
            throw new Error('TimeManager: Year values must be numbers');
        }

        if (startYear < 2000 || startYear > 3000) {
            throw new Error('TimeManager: Start year must be between 2000 and 3000');
        }

        if (currentYear < startYear) {
            throw new Error('TimeManager: Current year cannot be before start year');
        }

        if (!Number.isFinite(startYear) || !Number.isFinite(currentYear)) {
            throw new Error('TimeManager: Year values must be finite numbers');
        }

        this.startYear = startYear;
        this.currentYear = currentYear;
        this.startRealTime = Date.now();
        this.isPaused = false;

        console.log(`⏰ Time Manager initialized - Start: ${startYear}, Current: ${currentYear}`);
    }
    
    update() {
        if (this.isPaused || !this.startRealTime) {
            return;
        }
        
        // Calculate elapsed real time in seconds
        const now = Date.now();
        const elapsedMs = now - this.startRealTime - this.pausedTime;
        const elapsedSeconds = elapsedMs / 1000;
        
        // Calculate game years elapsed
        const yearsElapsed = elapsedSeconds * this.timeScale;
        
        // Update current year
        this.currentYear = this.startYear + yearsElapsed;
    }
    
    getCurrentYear() {
        return Math.floor(this.currentYear);
    }
    
    getCurrentYearPrecise() {
        return this.currentYear;
    }
    
    getCurrentDate() {
        const yearFraction = this.currentYear - Math.floor(this.currentYear);
        const dayOfYear = Math.floor(yearFraction * 365.25);
        
        return {
            year: this.getCurrentYear(),
            day: dayOfYear + 1,
            fraction: yearFraction
        };
    }
    
    getElapsedYears() {
        return this.currentYear - this.startYear;
    }
    
    getElapsedRealTime() {
        if (!this.startRealTime) return 0;
        return Date.now() - this.startRealTime - this.pausedTime;
    }
    
    /**
     * Convert real-world milliseconds to game years
     */
    realToGameTime(realMs) {
        const realSeconds = realMs / 1000;
        return realSeconds * this.timeScale;
    }
    
    /**
     * Convert game years to real-world milliseconds
     */
    gameToRealTime(gameYears) {
        const realSeconds = gameYears / this.timeScale;
        return realSeconds * 1000;
    }
    
    /**
     * Calculate how many real seconds until a future game year
     */
    timeUntilYear(targetYear) {
        const yearsRemaining = targetYear - this.currentYear;
        return this.gameToRealTime(yearsRemaining);
    }
    
    /**
     * Format time remaining for display
     */
    formatTimeRemaining(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        if (days > 0) {
            return `${days}g ${hours}h ${minutes}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        } else {
            return `${seconds}s`;
        }
    }
    
    /**
     * Format game date for display
     */
    formatGameDate() {
        const date = this.getCurrentDate();
        return `Anno ${date.year}, Giorno ${date.day}`;
    }
    
    /**
     * Pause time progression
     */
    pause() {
        if (!this.isPaused) {
            this.isPaused = true;
            this.pauseStartTime = Date.now();
        }
    }
    
    /**
     * Resume time progression
     */
    resume() {
        if (this.isPaused && this.pauseStartTime) {
            this.pausedTime += Date.now() - this.pauseStartTime;
            this.isPaused = false;
            this.pauseStartTime = null;
        }
    }
    
    /**
     * Get time scale info for display
     */
    getTimeScale() {
        return {
            realHours: 24,
            gameYears: 1,
            description: '24 ore reali = 1 anno di gioco'
        };
    }
}
