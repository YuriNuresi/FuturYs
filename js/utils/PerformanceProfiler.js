/**
 * 🎯 FuturY - Three.js Performance Profiler
 * Real-time performance monitoring and bottleneck detection
 * Task: card_501 - Profile Three.js performance
 * @version 1.0.0
 */

export class PerformanceProfiler {
    constructor(renderer, scene, camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;

        // FPS tracking
        this.frameCount = 0;
        this.lastFPSUpdate = performance.now();
        this.fps = 60;
        this.minFPS = 60;
        this.maxFPS = 60;
        this.avgFPS = 60;
        this.fpsHistory = [];
        this.maxHistoryLength = 120; // 2 seconds at 60fps

        // Frame timing
        this.frameTime = 0;
        this.minFrameTime = Infinity;
        this.maxFrameTime = 0;
        this.avgFrameTime = 0;
        this.lastFrameTime = performance.now();

        // Render statistics
        this.renderCalls = 0;
        this.triangles = 0;
        this.geometries = 0;
        this.textures = 0;
        this.programs = 0;

        // Memory tracking (estimated)
        this.geometryMemory = 0;
        this.textureMemory = 0;

        // Performance warnings
        this.warnings = [];
        this.warningThresholds = {
            lowFPS: 30,
            highFrameTime: 33.33, // 33.33ms = 30fps
            highDrawCalls: 500,
            highTriangles: 1000000,
            highTextures: 50
        };

        // Profiling state
        this.isEnabled = false;
        this.isPaused = false;

        // UI overlay
        this.overlay = null;
        this.createOverlay();
    }

    /**
     * Create performance overlay UI
     */
    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.id = 'performance-overlay';
        this.overlay.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.85);
            color: #0f0;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            padding: 15px;
            border-radius: 8px;
            border: 2px solid #0f0;
            z-index: 10000;
            min-width: 300px;
            box-shadow: 0 4px 20px rgba(0, 255, 0, 0.3);
            display: none;
        `;

        document.body.appendChild(this.overlay);
    }

    /**
     * Enable profiler
     */
    enable() {
        this.isEnabled = true;
        this.overlay.style.display = 'block';
        console.log('[Performance] Profiler enabled');
    }

    /**
     * Disable profiler
     */
    disable() {
        this.isEnabled = false;
        this.overlay.style.display = 'none';
        console.log('[Performance] Profiler disabled');
    }

    /**
     * Toggle profiler
     */
    toggle() {
        if (this.isEnabled) {
            this.disable();
        } else {
            this.enable();
        }
    }

    /**
     * Pause/resume profiling
     */
    togglePause() {
        this.isPaused = !this.isPaused;
        console.log(`[Performance] Profiler ${this.isPaused ? 'paused' : 'resumed'}`);
    }

    /**
     * Update profiler (call every frame)
     */
    update() {
        if (!this.isEnabled || this.isPaused) return;

        const now = performance.now();
        this.frameCount++;

        // Calculate FPS
        const fpsElapsed = now - this.lastFPSUpdate;
        if (fpsElapsed >= 1000) {
            this.fps = Math.round((this.frameCount / fpsElapsed) * 1000);
            this.fpsHistory.push(this.fps);

            if (this.fpsHistory.length > this.maxHistoryLength) {
                this.fpsHistory.shift();
            }

            // Update FPS stats
            this.minFPS = Math.min(this.minFPS, this.fps);
            this.maxFPS = Math.max(this.maxFPS, this.fps);
            this.avgFPS = Math.round(
                this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length
            );

            this.frameCount = 0;
            this.lastFPSUpdate = now;
        }

        // Calculate frame time
        this.frameTime = now - this.lastFrameTime;
        this.lastFrameTime = now;

        this.minFrameTime = Math.min(this.minFrameTime, this.frameTime);
        this.maxFrameTime = Math.max(this.maxFrameTime, this.frameTime);

        // Get renderer info
        const info = this.renderer.info;
        this.renderCalls = info.render.calls;
        this.triangles = info.render.triangles;
        this.geometries = info.memory.geometries;
        this.textures = info.memory.textures;
        this.programs = info.programs ? info.programs.length : 0;

        // Estimate memory usage
        this.estimateMemoryUsage();

        // Check for performance warnings
        this.checkWarnings();

        // Update overlay
        this.updateOverlay();
    }

    /**
     * Estimate GPU memory usage
     */
    estimateMemoryUsage() {
        // Reset counters
        this.geometryMemory = 0;
        this.textureMemory = 0;

        // Traverse scene to count vertices/textures
        this.scene.traverse((object) => {
            if (object.geometry) {
                const geo = object.geometry;

                if (geo.attributes.position) {
                    const vertexCount = geo.attributes.position.count;
                    const bytesPerVertex = 3 * 4; // vec3 * Float32
                    this.geometryMemory += vertexCount * bytesPerVertex;
                }

                // Count other attributes (normals, uvs, etc.)
                Object.keys(geo.attributes).forEach(attrName => {
                    if (attrName !== 'position') {
                        const attr = geo.attributes[attrName];
                        this.geometryMemory += attr.count * attr.itemSize * 4;
                    }
                });
            }

            if (object.material) {
                const materials = Array.isArray(object.material) ? object.material : [object.material];

                materials.forEach(mat => {
                    if (mat.map) {
                        this.textureMemory += this.estimateTextureSize(mat.map);
                    }
                    if (mat.normalMap) {
                        this.textureMemory += this.estimateTextureSize(mat.normalMap);
                    }
                    if (mat.roughnessMap) {
                        this.textureMemory += this.estimateTextureSize(mat.roughnessMap);
                    }
                });
            }
        });
    }

    /**
     * Estimate texture size in bytes
     */
    estimateTextureSize(texture) {
        if (!texture.image) return 0;

        const width = texture.image.width || 512;
        const height = texture.image.height || 512;

        // RGBA = 4 bytes per pixel
        return width * height * 4;
    }

    /**
     * Check for performance warnings
     */
    checkWarnings() {
        this.warnings = [];

        if (this.fps < this.warningThresholds.lowFPS) {
            this.warnings.push(`⚠️ Low FPS: ${this.fps} (target: ${this.warningThresholds.lowFPS}+)`);
        }

        if (this.frameTime > this.warningThresholds.highFrameTime) {
            this.warnings.push(`⚠️ High frame time: ${this.frameTime.toFixed(2)}ms`);
        }

        if (this.renderCalls > this.warningThresholds.highDrawCalls) {
            this.warnings.push(`⚠️ High draw calls: ${this.renderCalls}`);
        }

        if (this.triangles > this.warningThresholds.highTriangles) {
            this.warnings.push(`⚠️ High triangle count: ${this.formatNumber(this.triangles)}`);
        }

        if (this.textures > this.warningThresholds.highTextures) {
            this.warnings.push(`⚠️ High texture count: ${this.textures}`);
        }
    }

    /**
     * Update overlay display
     */
    updateOverlay() {
        const fpsColor = this.getFPSColor(this.fps);

        this.overlay.innerHTML = `
            <div style="border-bottom: 2px solid #0f0; padding-bottom: 10px; margin-bottom: 10px;">
                <strong>🎯 PERFORMANCE PROFILER</strong>
            </div>

            <div style="margin-bottom: 10px;">
                <strong style="color: ${fpsColor};">FPS: ${this.fps}</strong> (min: ${this.minFPS}, max: ${this.maxFPS}, avg: ${this.avgFPS})
                <div style="margin-top: 5px;">
                    ${this.renderFPSBar()}
                </div>
            </div>

            <div style="margin-bottom: 10px;">
                <strong>Frame Time:</strong> ${this.frameTime.toFixed(2)}ms
                <div>Min: ${this.minFrameTime.toFixed(2)}ms | Max: ${this.maxFrameTime.toFixed(2)}ms</div>
            </div>

            <div style="border-top: 1px solid #0a0; padding-top: 10px; margin-top: 10px;">
                <strong>RENDER STATS</strong>
            </div>

            <div style="margin-top: 5px;">
                Draw Calls: ${this.renderCalls}<br>
                Triangles: ${this.formatNumber(this.triangles)}<br>
                Geometries: ${this.geometries}<br>
                Textures: ${this.textures}<br>
                Programs: ${this.programs}
            </div>

            <div style="border-top: 1px solid #0a0; padding-top: 10px; margin-top: 10px;">
                <strong>MEMORY (estimated)</strong>
            </div>

            <div style="margin-top: 5px;">
                Geometry: ${this.formatBytes(this.geometryMemory)}<br>
                Textures: ${this.formatBytes(this.textureMemory)}<br>
                Total: ${this.formatBytes(this.geometryMemory + this.textureMemory)}
            </div>

            ${this.warnings.length > 0 ? `
                <div style="border-top: 2px solid #ff0; padding-top: 10px; margin-top: 10px; color: #ff0;">
                    <strong>⚠️ WARNINGS</strong>
                    ${this.warnings.map(w => `<div style="margin-top: 5px;">${w}</div>`).join('')}
                </div>
            ` : ''}

            <div style="border-top: 1px solid #0a0; padding-top: 10px; margin-top: 10px; font-size: 10px; color: #888;">
                Press <strong style="color: #0f0;">P</strong> to toggle profiler
            </div>
        `;
    }

    /**
     * Render FPS bar graph
     */
    renderFPSBar() {
        const history = this.fpsHistory.slice(-60); // Last 60 frames
        const maxFPS = 60;

        const bars = history.map(fps => {
            const height = Math.min(100, (fps / maxFPS) * 100);
            const color = this.getFPSColor(fps);
            return `<div style="display: inline-block; width: 3px; height: ${height}%; background: ${color}; margin-right: 1px; vertical-align: bottom;"></div>`;
        }).join('');

        return `<div style="height: 30px; display: flex; align-items: flex-end;">${bars}</div>`;
    }

    /**
     * Get color based on FPS
     */
    getFPSColor(fps) {
        if (fps >= 55) return '#0f0'; // Green
        if (fps >= 40) return '#ff0'; // Yellow
        if (fps >= 30) return '#fa0'; // Orange
        return '#f00'; // Red
    }

    /**
     * Format large numbers with K/M suffix
     */
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(2) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    /**
     * Format bytes to KB/MB
     */
    formatBytes(bytes) {
        if (bytes >= 1024 * 1024) {
            return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
        }
        if (bytes >= 1024) {
            return (bytes / 1024).toFixed(2) + ' KB';
        }
        return bytes + ' B';
    }

    /**
     * Generate performance report
     */
    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            fps: {
                current: this.fps,
                min: this.minFPS,
                max: this.maxFPS,
                average: this.avgFPS
            },
            frameTime: {
                current: this.frameTime,
                min: this.minFrameTime,
                max: this.maxFrameTime
            },
            render: {
                calls: this.renderCalls,
                triangles: this.triangles,
                geometries: this.geometries,
                textures: this.textures,
                programs: this.programs
            },
            memory: {
                geometry: this.geometryMemory,
                textures: this.textureMemory,
                total: this.geometryMemory + this.textureMemory
            },
            warnings: this.warnings,
            recommendations: this.generateRecommendations()
        };

        console.log('📊 Performance Report:', report);
        return report;
    }

    /**
     * Generate optimization recommendations
     */
    generateRecommendations() {
        const recommendations = [];

        if (this.renderCalls > 100) {
            recommendations.push('Consider merging geometries to reduce draw calls');
        }

        if (this.triangles > 500000) {
            recommendations.push('Implement LOD (Level of Detail) for distant objects');
        }

        if (this.textures > 30) {
            recommendations.push('Use texture atlases to reduce texture count');
        }

        if (this.fps < 30) {
            recommendations.push('Critical: FPS too low - check for render bottlenecks');
        }

        if (this.textureMemory > 100 * 1024 * 1024) { // 100MB
            recommendations.push('High texture memory usage - consider reducing texture resolution');
        }

        return recommendations;
    }

    /**
     * Reset statistics
     */
    reset() {
        this.minFPS = 60;
        this.maxFPS = 60;
        this.fpsHistory = [];
        this.minFrameTime = Infinity;
        this.maxFrameTime = 0;
        console.log('[Performance] Statistics reset');
    }

    /**
     * Dispose profiler
     */
    dispose() {
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
        }
        console.log('[Performance] Profiler disposed');
    }
}

/**
 * Setup keyboard shortcut for profiler
 */
export function setupProfilerHotkey(profiler) {
    window.addEventListener('keydown', (e) => {
        // Press 'P' to toggle profiler
        if (e.key === 'p' || e.key === 'P') {
            if (!e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                profiler.toggle();
            }
        }

        // Press 'R' to reset stats
        if (e.key === 'r' || e.key === 'R') {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                profiler.reset();
            }
        }

        // Press 'SPACE' to pause/resume
        if (e.key === ' ' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            profiler.togglePause();
        }
    });

    console.log('[Performance] Hotkeys registered: P (toggle), Ctrl+R (reset), Ctrl+Space (pause)');
}
