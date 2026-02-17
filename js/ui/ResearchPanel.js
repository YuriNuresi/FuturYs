/**
 * 🔬 ResearchPanel - Tech Tree Visualization (card_709)
 * Displays technologies as categorized nodes with prerequisites
 */
export class ResearchPanel {
    constructor(containerId, categoryFilterId) {
        this.container = document.getElementById(containerId);
        this.filterContainer = document.getElementById(categoryFilterId);
        this.technologies = [];
        this.activeCategory = 'ALL';
        this.sessionId = 1;
        this.onResearchStart = null;

        this.categories = [
            { code: 'ALL', label: 'All', icon: '🔬' },
            { code: 'PROPULSION', label: 'Propulsion', icon: '🚀' },
            { code: 'HABITAT', label: 'Habitat', icon: '🏠' },
            { code: 'ENERGY', label: 'Energy', icon: '⚡' },
            { code: 'MINING', label: 'Mining', icon: '⛏️' },
            { code: 'COMMUNICATION', label: 'Comm', icon: '📡' }
        ];
    }

    async init(sessionId = 1) {
        this.sessionId = sessionId;
        this.renderCategoryFilters();
        await this.loadTechnologies();
    }

    async loadTechnologies() {
        try {
            const response = await fetch(`php/api/research.php?session_id=${this.sessionId}`);
            const result = await response.json();

            if (result.success && result.data?.technologies) {
                this.technologies = result.data.technologies;
                this.render();
            } else {
                this.container.innerHTML = `<div style="color: var(--color-text-faint); font-size: var(--font-size-base);">Failed to load technologies</div>`;
            }
        } catch (error) {
            console.warn('[ResearchPanel] Failed to load:', error);
            this.container.innerHTML = `<div style="color: var(--color-text-faint); font-size: var(--font-size-base);">Research unavailable</div>`;
        }
    }

    renderCategoryFilters() {
        if (!this.filterContainer) return;

        this.filterContainer.innerHTML = this.categories.map(cat =>
            `<button class="tech-category-btn ${cat.code === this.activeCategory ? 'active' : ''}" data-category="${cat.code}">
                ${cat.icon} ${cat.label}
            </button>`
        ).join('');

        this.filterContainer.querySelectorAll('.tech-category-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.activeCategory = btn.dataset.category;
                this.filterContainer.querySelectorAll('.tech-category-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.render();
            });
        });
    }

    render() {
        if (!this.container) return;

        const filtered = this.activeCategory === 'ALL'
            ? this.technologies
            : this.technologies.filter(t => t.category === this.activeCategory);

        if (filtered.length === 0) {
            this.container.innerHTML = `<div style="color: var(--color-text-faint); font-size: var(--font-size-base);">No technologies in this category</div>`;
            return;
        }

        // Group by tier
        const byTier = {};
        filtered.forEach(tech => {
            const tier = tech.tier || 1;
            if (!byTier[tier]) byTier[tier] = [];
            byTier[tier].push(tech);
        });

        let html = '';

        // Render tier by tier
        for (const tier of Object.keys(byTier).sort((a, b) => a - b)) {
            html += `<div style="margin-bottom: var(--space-md);">
                <div style="color: var(--color-text-faint); font-size: var(--font-size-xs); margin-bottom: var(--space-xs); text-transform: uppercase; letter-spacing: 1px;">Tier ${tier}</div>`;

            byTier[tier].forEach(tech => {
                html += this.renderTechNode(tech);
            });

            html += '</div>';
        }

        this.container.innerHTML = html;

        // Attach click handlers
        this.container.querySelectorAll('.tech-node[data-tech-id]').forEach(node => {
            node.addEventListener('click', () => {
                const techId = parseInt(node.dataset.techId);
                const tech = this.technologies.find(t => t.id === techId);
                if (tech && tech.research_status === 'AVAILABLE') {
                    this.startResearch(techId);
                }
            });
        });
    }

    renderTechNode(tech) {
        const statusClass = tech.research_status.toLowerCase();
        const categoryIcons = {
            'PROPULSION': '🚀', 'HABITAT': '🏠', 'ENERGY': '⚡',
            'MINING': '⛏️', 'COMMUNICATION': '📡'
        };
        const icon = categoryIcons[tech.category] || '🔬';

        const statusBadges = {
            'COMPLETED': '✅',
            'RESEARCHING': '⏳',
            'AVAILABLE': '🔓',
            'LOCKED': '🔒'
        };
        const badge = statusBadges[tech.research_status] || '';

        // Effects summary
        const effects = tech.effects_data || {};
        const effectsList = Object.entries(effects)
            .filter(([k]) => !k.startsWith('unlock'))
            .map(([k, v]) => {
                const label = k.replace(/_/g, ' ').replace('bonus', '').trim();
                const value = typeof v === 'number' ? `+${(v * 100).toFixed(0)}%` : v;
                return `<span class="cost-item">${label}: ${value}</span>`;
            }).join('');

        // Progress bar for researching
        let progressHtml = '';
        if (tech.research_status === 'RESEARCHING') {
            const pct = ((tech.progress || 0) * 100).toFixed(0);
            progressHtml = `
                <div class="building-progress" style="margin-top: var(--space-sm);">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${pct}%; background: linear-gradient(90deg, var(--color-warning), var(--color-accent));"></div>
                    </div>
                    <div style="font-size: var(--font-size-xs); color: var(--color-text-faint); margin-top: 2px;">${pct}% researched</div>
                </div>
            `;
        }

        return `
            <div class="tech-node ${statusClass}" data-tech-id="${tech.id}" title="${tech.description || ''}">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div class="tech-node__name">${icon} ${tech.name}</div>
                    <span style="font-size: var(--font-size-lg);">${badge}</span>
                </div>
                <div class="tech-node__desc">${tech.description || ''}</div>
                <div class="tech-node__cost">
                    <span class="cost-item">🔬 ${tech.science_cost?.toLocaleString()}</span>
                    <span class="cost-item">⏱️ ${tech.research_time_years}y</span>
                </div>
                ${effectsList ? `<div style="display: flex; gap: var(--space-xs); flex-wrap: wrap; margin-top: var(--space-xs);">${effectsList}</div>` : ''}
                ${progressHtml}
            </div>
        `;
    }

    async startResearch(techId) {
        try {
            const response = await fetch('php/api/research.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: this.sessionId, tech_id: techId })
            });
            const result = await response.json();

            if (result.success) {
                if (this.onResearchStart) {
                    this.onResearchStart(result.data);
                }
                await this.loadTechnologies();
            } else {
                console.warn('[ResearchPanel] Research failed:', result.error);
                if (this.onResearchStart) {
                    this.onResearchStart({ error: result.error });
                }
            }
        } catch (error) {
            console.error('[ResearchPanel] Error starting research:', error);
        }
    }

    /**
     * Update research progress based on current game year
     */
    updateProgress(currentGameYear) {
        let needsRerender = false;

        this.technologies.forEach(tech => {
            if (tech.research_status === 'RESEARCHING' && tech.research_start_year && tech.research_completion_year) {
                const totalTime = tech.research_completion_year - tech.research_start_year;
                const elapsed = currentGameYear - tech.research_start_year;
                const newProgress = Math.min(1.0, elapsed / totalTime);

                if (Math.abs(newProgress - (tech.progress || 0)) > 0.01) {
                    tech.progress = newProgress;
                    needsRerender = true;
                }

                if (newProgress >= 1.0 && tech.research_status !== 'COMPLETED') {
                    tech.research_status = 'COMPLETED';
                    needsRerender = true;
                }
            }
        });

        if (needsRerender) {
            this.render();
        }
    }
}
