/**
 * 💰 EconomyPanel - Resource Balance Table (card_711)
 * Displays production, consumption, and net balance for all resources
 */
export class EconomyPanel {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.resourceManager = null;
        this.buildingManager = null;
    }

    init(resourceManager, buildingManager) {
        this.resourceManager = resourceManager;
        this.buildingManager = buildingManager;
        this.render();
    }

    render() {
        if (!this.container || !this.resourceManager) {
            return;
        }

        const resources = this.getResourceBreakdown();
        const warnings = this.getWarnings(resources);

        let html = '<h4 style="color: var(--color-accent); font-size: var(--font-size-lg); margin-bottom: var(--space-md);">📊 Resource Balance</h4>';

        // Main balance table
        html += `
            <table class="economy-table">
                <thead>
                    <tr>
                        <th>Resource</th>
                        <th>Current</th>
                        <th>Production</th>
                        <th>Net /year</th>
                    </tr>
                </thead>
                <tbody>
        `;

        resources.forEach(r => {
            const netClass = r.net > 0 ? 'positive' : r.net < 0 ? 'negative' : 'neutral';
            const netPrefix = r.net > 0 ? '+' : '';

            html += `
                <tr>
                    <td>${r.icon} ${r.name}</td>
                    <td>${r.currentFormatted}</td>
                    <td class="positive">${r.production > 0 ? '+' + this.formatNumber(r.production) : '-'}</td>
                    <td class="${netClass}">${netPrefix}${this.formatNumber(r.net)}</td>
                </tr>
            `;
        });

        html += '</tbody></table>';

        // Building production breakdown
        if (this.buildingManager) {
            const buildings = this.buildingManager.getPlanetBuildings('Earth').filter(b => b.status === 'COMPLETED');
            if (buildings.length > 0) {
                html += `
                    <h4 style="color: var(--color-accent); font-size: var(--font-size-md); margin-top: var(--space-xl); margin-bottom: var(--space-sm);">🏗️ Building Production</h4>
                    <div style="font-size: var(--font-size-base);">
                `;

                buildings.forEach(b => {
                    const icon = this.buildingManager.getBuildingIcon?.(b.building_code) || '🏗️';
                    html += `
                        <div style="display: flex; justify-content: space-between; padding: var(--space-xs) 0; border-bottom: 1px solid var(--color-accent-subtle);">
                            <span style="color: var(--color-text-secondary);">${icon} ${b.name}</span>
                            <span style="color: var(--color-success); font-size: var(--font-size-sm);">Active</span>
                        </div>
                    `;
                });

                html += '</div>';
            }
        }

        // Projections
        html += `
            <h4 style="color: var(--color-accent); font-size: var(--font-size-md); margin-top: var(--space-xl); margin-bottom: var(--space-sm);">📈 Projections</h4>
            <div style="font-size: var(--font-size-base); color: var(--color-text-secondary);">
        `;

        resources.forEach(r => {
            if (r.net < 0 && r.current > 0) {
                const yearsUntilEmpty = r.current / Math.abs(r.net);
                const daysReal = (yearsUntilEmpty * 86400 / 3600 / 24).toFixed(1);
                html += `
                    <div style="padding: var(--space-xs) 0;">
                        ${r.icon} ${r.name}: depleted in ~${yearsUntilEmpty.toFixed(1)} game years (~${daysReal} real days)
                    </div>
                `;
            }
        });

        html += '</div>';

        // Warnings
        if (warnings.length > 0) {
            warnings.forEach(w => {
                html += `<div class="economy-warning">⚠️ ${w}</div>`;
            });
        }

        this.container.innerHTML = html;
    }

    getResourceBreakdown() {
        const rm = this.resourceManager;
        if (!rm) return [];

        const formatted = rm.getAllFormatted();
        const resourceKeys = ['budget', 'science', 'population', 'energy', 'materials', 'food', 'water', 'oxygen'];

        return resourceKeys.map(key => {
            const data = formatted[key];
            if (!data) return null;

            const production = rm.getProduction?.(key) || 0;
            const current = rm.getResource?.(key) || 0;

            return {
                key,
                name: data.name || key,
                icon: data.icon || '📦',
                current,
                currentFormatted: data.value || this.formatNumber(current),
                production,
                consumption: 0,
                net: production
            };
        }).filter(Boolean);
    }

    getWarnings(resources) {
        const warnings = [];

        resources.forEach(r => {
            if (r.net < 0 && r.current > 0) {
                const yearsLeft = r.current / Math.abs(r.net);
                if (yearsLeft < 2) {
                    warnings.push(`${r.icon} ${r.name} will run out in ${yearsLeft.toFixed(1)} years!`);
                }
            }
            if (r.current <= 0 && r.net <= 0) {
                warnings.push(`${r.icon} ${r.name} is depleted!`);
            }
        });

        return warnings;
    }

    formatNumber(num) {
        if (num === 0) return '0';
        if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(1) + 'B';
        if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(1) + 'M';
        if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(1) + 'K';
        return num.toFixed(0);
    }
}
