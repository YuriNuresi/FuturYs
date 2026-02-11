/**
 * FUTURY - Tutorial Manager
 * Interactive step-by-step tutorial for new players
 * @version 1.0.0
 */

export class TutorialManager {
    constructor() {
        this.currentStep = 0;
        this.isActive = false;
        this.steps = [];
        this.overlay = null;
        this.tooltip = null;
        this.onComplete = null;
    }

    /**
     * Initialize tutorial system
     */
    init() {
        this.createOverlay();
        this.createTooltip();
        this.defineTutorialSteps();

        console.log('[Tutorial] Manager initialized');
    }

    /**
     * Define all tutorial steps (card_310)
     */
    defineTutorialSteps() {
        this.steps = [
            {
                id: 'welcome',
                title: '🚀 Welcome to FuturY!',
                text: 'Year 2100. Earth is dying. You must colonize other planets to save humanity. This tutorial will guide you through the basics.',
                highlight: null,
                action: 'click'
            },
            {
                id: 'hud-resources',
                title: '📊 Resources Panel',
                text: 'Monitor your resources here: Budget, Science, Population, and Energy. These regenerate over time and are needed for missions and buildings.',
                highlight: '#resources-display',
                action: 'click'
            },
            {
                id: 'time-system',
                title: '⏰ Time System',
                text: 'Time flows continuously: 24 real hours = 1 game year. Missions and buildings take time. You can see the current year here.',
                highlight: '#hud',
                action: 'click'
            },
            {
                id: 'select-planet',
                title: '🌍 Select a Planet',
                text: 'Click on Mars (the red planet) to select it and view mission details.',
                highlight: null,
                action: 'planet-click',
                targetPlanet: 'Mars'
            },
            {
                id: 'launch-mission',
                title: '🚀 Launch Your First Mission',
                text: 'Click "Launch Mission" to send your first expedition to Mars. This will cost resources and take about 2.5 days (real time).',
                highlight: '#launch-mission-btn',
                action: 'mission-launch'
            },
            {
                id: 'buildings',
                title: '🏗️ Buildings',
                text: 'Click the Buildings button to construct facilities that boost your resource production.',
                highlight: '[data-view="buildings"]',
                action: 'nav-click',
                targetView: 'buildings'
            },
            {
                id: 'tutorial-complete',
                title: '✨ Tutorial Complete!',
                text: 'You\'re ready to save humanity! Build structures, research technologies, and colonize the solar system. Good luck, Commander!',
                highlight: null,
                action: 'click'
            }
        ];
    }

    /**
     * Create overlay element
     */
    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.id = 'tutorial-overlay';
        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.7);
            z-index: 10000;
            display: none;
            pointer-events: none;
        `;
        document.body.appendChild(this.overlay);
    }

    /**
     * Create tooltip element
     */
    createTooltip() {
        this.tooltip = document.createElement('div');
        this.tooltip.id = 'tutorial-tooltip';
        this.tooltip.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(15, 23, 42, 0.98);
            border: 2px solid #4fd1c7;
            border-radius: 15px;
            padding: 30px;
            max-width: 500px;
            z-index: 10001;
            display: none;
            box-shadow: 0 10px 50px rgba(79, 209, 199, 0.5);
        `;
        this.tooltip.innerHTML = `
            <div id="tutorial-content">
                <h2 id="tutorial-title" style="color: #4fd1c7; margin-bottom: 15px; font-size: 1.5rem;"></h2>
                <p id="tutorial-text" style="color: #e2e8f0; line-height: 1.6; margin-bottom: 20px;"></p>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span id="tutorial-progress" style="color: #a0aec0; font-size: 0.9rem;"></span>
                    <div style="display: flex; gap: 10px;">
                        <button id="tutorial-skip" style="
                            padding: 10px 20px;
                            background: transparent;
                            border: 1px solid #a0aec0;
                            border-radius: 8px;
                            color: #a0aec0;
                            cursor: pointer;
                            transition: all 0.2s;
                        ">Skip</button>
                        <button id="tutorial-next" style="
                            padding: 10px 30px;
                            background: linear-gradient(135deg, #4fd1c7, #63b3ed);
                            border: none;
                            border-radius: 8px;
                            color: white;
                            font-weight: bold;
                            cursor: pointer;
                            transition: all 0.2s;
                        ">Next</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(this.tooltip);

        // Event listeners
        document.getElementById('tutorial-next').addEventListener('click', () => this.nextStep());
        document.getElementById('tutorial-skip').addEventListener('click', () => this.skip());
    }

    /**
     * Start tutorial
     */
    start() {
        // Check if tutorial was already completed
        if (localStorage.getItem('tutorialCompleted') === 'true') {
            console.log('[Tutorial] Already completed');
            return false;
        }

        this.isActive = true;
        this.currentStep = 0;
        this.showStep(0);
        console.log('[Tutorial] Started');
        return true;
    }

    /**
     * Show specific step
     */
    showStep(stepIndex) {
        if (stepIndex >= this.steps.length) {
            this.complete();
            return;
        }

        const step = this.steps[stepIndex];

        // Update tooltip content
        document.getElementById('tutorial-title').textContent = step.title;
        document.getElementById('tutorial-text').textContent = step.text;
        document.getElementById('tutorial-progress').textContent = `Step ${stepIndex + 1}/${this.steps.length}`;

        // Show overlay and tooltip
        this.overlay.style.display = 'block';
        this.tooltip.style.display = 'block';

        // Highlight element if specified
        this.clearHighlight();
        if (step.highlight) {
            this.highlightElement(step.highlight);
        }

        // Update button text
        const nextBtn = document.getElementById('tutorial-next');
        if (stepIndex === this.steps.length - 1) {
            nextBtn.textContent = 'Finish';
        } else if (step.action !== 'click') {
            nextBtn.textContent = 'Waiting...';
            nextBtn.disabled = true;
        } else {
            nextBtn.textContent = 'Next';
            nextBtn.disabled = false;
        }
    }

    /**
     * Highlight UI element
     */
    highlightElement(selector) {
        const element = document.querySelector(selector);
        if (element) {
            element.style.position = 'relative';
            element.style.zIndex = '10002';
            element.style.boxShadow = '0 0 0 4px rgba(79, 209, 199, 0.6), 0 0 30px rgba(79, 209, 199, 0.8)';
            element.style.transition = 'all 0.3s';
            element.classList.add('tutorial-highlight');

            // Make element clickable even with overlay
            element.style.pointerEvents = 'auto';
        }
    }

    /**
     * Clear highlights
     */
    clearHighlight() {
        document.querySelectorAll('.tutorial-highlight').forEach(el => {
            el.style.zIndex = '';
            el.style.boxShadow = '';
            el.classList.remove('tutorial-highlight');
            el.style.pointerEvents = '';
        });
    }

    /**
     * Go to next step
     */
    nextStep() {
        this.currentStep++;
        this.showStep(this.currentStep);
    }

    /**
     * Handle tutorial events (called from game code)
     */
    onEvent(eventType, data) {
        if (!this.isActive) return;

        const step = this.steps[this.currentStep];
        if (!step) return;

        let shouldAdvance = false;

        switch (step.action) {
            case 'planet-click':
                if (eventType === 'planet-click' && data === step.targetPlanet) {
                    shouldAdvance = true;
                }
                break;

            case 'mission-launch':
                if (eventType === 'mission-launch') {
                    shouldAdvance = true;
                }
                break;

            case 'nav-click':
                if (eventType === 'nav-click' && data === step.targetView) {
                    shouldAdvance = true;
                }
                break;
        }

        if (shouldAdvance) {
            setTimeout(() => this.nextStep(), 500);
        }
    }

    /**
     * Skip tutorial
     */
    skip() {
        if (confirm('Are you sure you want to skip the tutorial?')) {
            this.complete();
        }
    }

    /**
     * Complete tutorial
     */
    complete() {
        this.isActive = false;
        this.overlay.style.display = 'none';
        this.tooltip.style.display = 'none';
        this.clearHighlight();

        // Mark as completed
        localStorage.setItem('tutorialCompleted', 'true');

        console.log('[Tutorial] Completed');

        if (this.onComplete) {
            this.onComplete();
        }
    }

    /**
     * Reset tutorial (for testing)
     */
    reset() {
        localStorage.removeItem('tutorialCompleted');
        this.currentStep = 0;
        console.log('[Tutorial] Reset');
    }
}
