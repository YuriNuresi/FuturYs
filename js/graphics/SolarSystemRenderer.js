/**
 * SolarSystemRenderer - 3D Solar System Scene (Three.js)
 * Keplerian orbital mechanics with NASA JPL elements (J2000.0 epoch)
 * @version 3.0.0
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Orbital Elements (NASA JPL, epoch J2000.0 = 1 Jan 2000 12:00 TT) ---
// a = semi-major axis (AU), e = eccentricity, I = inclination (deg),
// L0 = mean longitude at epoch (deg), wbar = longitude of perihelion (deg),
// omega = longitude of ascending node (deg), period = orbital period (years)
const ORBITAL_ELEMENTS = {
    mercury: { a: 0.38710, e: 0.20563, I: 7.005, L0: 252.251, wbar: 77.456, omega: 48.331, period: 0.24085 },
    venus:   { a: 0.72333, e: 0.00677, I: 3.395, L0: 181.980, wbar: 131.564, omega: 76.680, period: 0.61520 },
    earth:   { a: 1.00000, e: 0.01671, I: 0.000, L0: 100.464, wbar: 102.937, omega: 0.000, period: 1.00000 },
    mars:    { a: 1.52368, e: 0.09340, I: 1.850, L0: 355.453, wbar: 336.060, omega: 49.558, period: 1.88082 },
    jupiter: { a: 5.20260, e: 0.04849, I: 1.303, L0: 34.404, wbar: 14.331, omega: 100.464, period: 11.8622 },
    saturn:  { a: 9.55491, e: 0.05551, I: 2.489, L0: 50.077, wbar: 93.057, omega: 113.666, period: 29.4571 },
    uranus:  { a: 19.1817, e: 0.04686, I: 0.773, L0: 314.055, wbar: 173.005, omega: 74.006, period: 84.0110 },
    neptune: { a: 30.0690, e: 0.00895, I: 1.770, L0: 304.349, wbar: 48.124, omega: 131.784, period: 164.790 }
};

// Distance scaling: compress AU to scene units so all planets are visible
const DIST_BASE = 18;
const DIST_SCALE = 28;
const DIST_POWER = 0.45;

function auToScene(au) {
    return DIST_BASE + DIST_SCALE * Math.pow(au, DIST_POWER);
}

function degToRad(deg) {
    return deg * Math.PI / 180;
}

/**
 * Solve Kepler's equation  M = E - e*sin(E)  via Newton-Raphson
 * @param {number} M - mean anomaly (radians)
 * @param {number} e - eccentricity
 * @returns {number} E - eccentric anomaly (radians)
 */
function solveKepler(M, e) {
    let E = M;
    for (let i = 0; i < 20; i++) {
        const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
        E -= dE;
        if (Math.abs(dE) < 1e-10) break;
    }
    return E;
}

/**
 * Compute heliocentric position for given orbital elements and year
 * Returns {x, y, z} in scene units
 */
function computeOrbitalPosition(elements, year) {
    const { a, e, I, L0, wbar, omega, period } = elements;

    // Mean longitude at given year
    const n = 360 / period; // mean motion (deg/year)
    const dt = year - 2000.0;
    const L = (L0 + n * dt) % 360;

    // Mean anomaly
    const M = degToRad(((L - wbar) % 360 + 360) % 360);

    // Solve Kepler's equation
    const E = solveKepler(M, e);

    // Position in orbital plane
    const xPrime = a * (Math.cos(E) - e);
    const yPrime = a * Math.sqrt(1 - e * e) * Math.sin(E);

    // Rotate to heliocentric ecliptic coordinates
    const w = degToRad(wbar - omega); // argument of perihelion
    const Om = degToRad(omega);
    const inc = degToRad(I);

    const cosW = Math.cos(w), sinW = Math.sin(w);
    const cosOm = Math.cos(Om), sinOm = Math.sin(Om);
    const cosI = Math.cos(inc), sinI = Math.sin(inc);

    const x = (cosW * cosOm - sinW * sinOm * cosI) * xPrime +
              (-sinW * cosOm - cosW * sinOm * cosI) * yPrime;
    const y = (cosW * sinOm + sinW * cosOm * cosI) * xPrime +
              (-sinW * sinOm + cosW * cosOm * cosI) * yPrime;
    const z = (sinW * sinI) * xPrime + (cosW * sinI) * yPrime;

    // Scale to scene units
    const scale = auToScene(a) / a; // uniform scale per planet
    return { x: x * scale, y: z * scale, z: -y * scale }; // Y-up coordinate swap
}


export class SolarSystemRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.onPlanetClick = null;

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.clock = new THREE.Clock();

        // Scene objects
        this.planets = new Map();
        this.sun = null;
        this.starfield = null;

        // Game time — updated externally by TimeManager
        this.gameYear = 2100;

        this._boundResize = this._onWindowResize.bind(this);
    }

    async init() {
        console.log('Initializing 3D Solar System...');

        this._setupRenderer();
        this._setupCamera();
        this._setupControls();
        this._setupLighting();
        this._createSun();
        this._createMercury();
        this._createVenus();
        this._createEarth();
        this._createMars();
        this._createJupiter();
        this._createSaturn();
        this._createUranus();
        this._createNeptune();
        this._createStarfield();

        window.addEventListener('resize', this._boundResize);

        console.log('Solar System scene ready');
    }

    // --- Setup ---

    _setupRenderer() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000005);

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: false
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
    }

    _setupCamera() {
        const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
        this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 50000);
        this.camera.position.set(0, 80, 200);
        this.camera.lookAt(0, 0, 0);
    }

    _setupControls() {
        this.controls = new OrbitControls(this.camera, this.canvas);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.minDistance = 20;
        this.controls.maxDistance = 1000;
        this.controls.enablePan = true;
        this.controls.panSpeed = 0.8;
        this.controls.rotateSpeed = 0.6;
        this.controls.zoomSpeed = 1.2;
    }

    _setupLighting() {
        const ambient = new THREE.AmbientLight(0x111122, 0.3);
        this.scene.add(ambient);

        const sunLight = new THREE.PointLight(0xffffff, 2.0, 0, 0.5);
        sunLight.position.set(0, 0, 0);
        this.scene.add(sunLight);
    }

    _createSun() {
        const sunGroup = new THREE.Group();

        const coreGeo = new THREE.SphereGeometry(8, 64, 64);
        const coreMat = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
        sunGroup.add(new THREE.Mesh(coreGeo, coreMat));

        const glowGeo = new THREE.SphereGeometry(9.5, 32, 32);
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0xffaa00, transparent: true, opacity: 0.3, side: THREE.BackSide
        });
        sunGroup.add(new THREE.Mesh(glowGeo, glowMat));

        const coronaGeo = new THREE.SphereGeometry(12, 32, 32);
        const coronaMat = new THREE.MeshBasicMaterial({
            color: 0xff6600, transparent: true, opacity: 0.1, side: THREE.BackSide
        });
        sunGroup.add(new THREE.Mesh(coronaGeo, coronaMat));

        this.sun = sunGroup;
        this.scene.add(this.sun);
    }

    // --- Planets ---

    /**
     * @param {string} name
     * @param {object} opts
     * @param {number} opts.radius - sphere radius
     * @param {number} opts.color - hex color
     * @param {number} opts.rotationPeriod - sidereal rotation period in Earth hours (negative = retrograde)
     * @param {number} opts.axialTilt - axial tilt in degrees
     * @param {THREE.Mesh[]} [opts.extras] - extra meshes (atmosphere, rings)
     */
    _addPlanet(name, { radius, color, rotationPeriod, axialTilt, extras }) {
        const geo = new THREE.SphereGeometry(radius, 32, 32);
        const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.1 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.name = name;
        this.scene.add(mesh);

        const extraMeshes = extras || [];
        extraMeshes.forEach(m => this.scene.add(m));

        // Pre-compute tilted rotation axis
        const tilt = degToRad(axialTilt || 0);
        const rotationAxis = new THREE.Vector3(Math.sin(tilt), Math.cos(tilt), 0).normalize();

        // Rotations per game year = (365.25 * 24) / |rotationPeriod|
        // Sign of rotationPeriod handles retrograde
        const rotationsPerYear = (365.25 * 24) / rotationPeriod;

        this.planets.set(name, {
            mesh, extras: extraMeshes, rotationAxis, rotationsPerYear,
            elements: ORBITAL_ELEMENTS[name]
        });
    }

    _createMercury() {
        this._addPlanet('mercury', {
            radius: 1.2, color: 0x8c7e6d, rotationPeriod: 1407.6, axialTilt: 0.034
        });
    }

    _createVenus() {
        this._addPlanet('venus', {
            radius: 2.8, color: 0xe8cda0, rotationPeriod: -5832.5, axialTilt: 177.4
        });
    }

    _createEarth() {
        const atmoGeo = new THREE.SphereGeometry(3.3, 32, 32);
        const atmoMat = new THREE.MeshBasicMaterial({
            color: 0x88bbff, transparent: true, opacity: 0.15, side: THREE.BackSide
        });
        const atmosphere = new THREE.Mesh(atmoGeo, atmoMat);

        this._addPlanet('earth', {
            radius: 3, color: 0x2266aa, rotationPeriod: 23.93, axialTilt: 23.44, extras: [atmosphere]
        });
    }

    _createMars() {
        this._addPlanet('mars', {
            radius: 1.6, color: 0xc1440e, rotationPeriod: 24.62, axialTilt: 25.19
        });
    }

    _createJupiter() {
        this._addPlanet('jupiter', {
            radius: 6.5, color: 0xc8a87a, rotationPeriod: 9.93, axialTilt: 3.13
        });
    }

    _createSaturn() {
        const ringGeo = new THREE.RingGeometry(7, 12, 64);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0xc2a55a, transparent: true, opacity: 0.6, side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI * 0.45;

        this._addPlanet('saturn', {
            radius: 5.5, color: 0xd4b86a, rotationPeriod: 10.66, axialTilt: 26.73, extras: [ring]
        });
    }

    _createUranus() {
        this._addPlanet('uranus', {
            radius: 4, color: 0x7ec8c8, rotationPeriod: -17.24, axialTilt: 97.77
        });
    }

    _createNeptune() {
        this._addPlanet('neptune', {
            radius: 3.8, color: 0x3344aa, rotationPeriod: 16.11, axialTilt: 28.32
        });
    }

    _createStarfield() {
        // --- Layer 1: Background stars (small, numerous, subtle) ---
        const bgCount = 6000;
        const bgPositions = new Float32Array(bgCount * 3);
        const bgColors = new Float32Array(bgCount * 3);
        const bgSizes = new Float32Array(bgCount);
        const radius = 20000;

        // Spectral class color palette (approximate RGB)
        const STAR_COLORS = [
            { r: 0.62, g: 0.69, b: 1.0 },   // O/B — blue-white
            { r: 0.82, g: 0.87, b: 1.0 },   // A — white-blue
            { r: 1.0,  g: 0.98, b: 0.95 },  // F — warm white
            { r: 1.0,  g: 0.93, b: 0.78 },  // G — yellow (Sun-like)
            { r: 1.0,  g: 0.82, b: 0.62 },  // K — orange
            { r: 1.0,  g: 0.70, b: 0.50 },  // M — red-orange
        ];
        // Weighted distribution: cooler stars are far more common
        const STAR_WEIGHTS = [0.02, 0.05, 0.10, 0.18, 0.30, 0.35];
        const cumulativeWeights = [];
        STAR_WEIGHTS.reduce((sum, w, i) => { cumulativeWeights[i] = sum + w; return sum + w; }, 0);

        function pickStarColor() {
            const r = Math.random();
            for (let i = 0; i < cumulativeWeights.length; i++) {
                if (r < cumulativeWeights[i]) return STAR_COLORS[i];
            }
            return STAR_COLORS[STAR_COLORS.length - 1];
        }

        for (let i = 0; i < bgCount; i++) {
            const i3 = i * 3;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = radius * (0.85 + Math.random() * 0.15);
            bgPositions[i3]     = r * Math.sin(phi) * Math.cos(theta);
            bgPositions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            bgPositions[i3 + 2] = r * Math.cos(phi);

            const c = pickStarColor();
            const brightness = 0.4 + Math.random() * 0.6;
            bgColors[i3]     = c.r * brightness;
            bgColors[i3 + 1] = c.g * brightness;
            bgColors[i3 + 2] = c.b * brightness;

            bgSizes[i] = 0.8 + Math.random() * 1.2;
        }

        const bgGeometry = new THREE.BufferGeometry();
        bgGeometry.setAttribute('position', new THREE.BufferAttribute(bgPositions, 3));
        bgGeometry.setAttribute('color', new THREE.BufferAttribute(bgColors, 3));
        bgGeometry.setAttribute('size', new THREE.BufferAttribute(bgSizes, 1));

        const bgMaterial = new THREE.PointsMaterial({
            size: 1.0, sizeAttenuation: true, vertexColors: true,
            transparent: true, opacity: 0.85
        });

        const bgStars = new THREE.Points(bgGeometry, bgMaterial);
        this.scene.add(bgStars);

        // --- Layer 2: Bright highlight stars (fewer, larger, with twinkle) ---
        const brightCount = 400;
        const brPositions = new Float32Array(brightCount * 3);
        const brColors = new Float32Array(brightCount * 3);

        for (let i = 0; i < brightCount; i++) {
            const i3 = i * 3;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = radius * (0.9 + Math.random() * 0.1);
            brPositions[i3]     = r * Math.sin(phi) * Math.cos(theta);
            brPositions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            brPositions[i3 + 2] = r * Math.cos(phi);

            const c = pickStarColor();
            brColors[i3]     = c.r;
            brColors[i3 + 1] = c.g;
            brColors[i3 + 2] = c.b;
        }

        const brGeometry = new THREE.BufferGeometry();
        brGeometry.setAttribute('position', new THREE.BufferAttribute(brPositions, 3));
        brGeometry.setAttribute('color', new THREE.BufferAttribute(brColors, 3));

        const brMaterial = new THREE.PointsMaterial({
            size: 2.8, sizeAttenuation: true, vertexColors: true,
            transparent: true, opacity: 1.0
        });

        const brightStars = new THREE.Points(brGeometry, brMaterial);
        this.scene.add(brightStars);

        // --- Layer 3: Milky Way band (dense cluster of tiny dim stars along galactic plane) ---
        const mwCount = 4000;
        const mwPositions = new Float32Array(mwCount * 3);
        const mwColors = new Float32Array(mwCount * 3);

        // Galactic plane: tilted ~60° from ecliptic, concentrated near a band
        const galTilt = degToRad(60);
        const cosGal = Math.cos(galTilt);
        const sinGal = Math.sin(galTilt);

        for (let i = 0; i < mwCount; i++) {
            const i3 = i * 3;
            // Concentrate around galactic equator using Gaussian-like distribution
            const galLon = Math.random() * Math.PI * 2;
            const galLat = (Math.random() + Math.random() + Math.random() - 1.5) * 0.35; // peaked at 0
            const r = radius * (0.85 + Math.random() * 0.15);

            // Spherical in galactic coords
            const x = r * Math.cos(galLat) * Math.cos(galLon);
            const y = r * Math.cos(galLat) * Math.sin(galLon);
            const z = r * Math.sin(galLat);

            // Rotate galactic → ecliptic (tilt around X axis)
            mwPositions[i3]     = x;
            mwPositions[i3 + 1] = y * cosGal - z * sinGal;
            mwPositions[i3 + 2] = y * sinGal + z * cosGal;

            const brightness = 0.15 + Math.random() * 0.35;
            mwColors[i3]     = 0.85 * brightness;
            mwColors[i3 + 1] = 0.82 * brightness;
            mwColors[i3 + 2] = 1.0  * brightness;
        }

        const mwGeometry = new THREE.BufferGeometry();
        mwGeometry.setAttribute('position', new THREE.BufferAttribute(mwPositions, 3));
        mwGeometry.setAttribute('color', new THREE.BufferAttribute(mwColors, 3));

        const mwMaterial = new THREE.PointsMaterial({
            size: 0.7, sizeAttenuation: true, vertexColors: true,
            transparent: true, opacity: 0.6
        });

        const milkyWay = new THREE.Points(mwGeometry, mwMaterial);
        this.scene.add(milkyWay);

        // Keep references for dispose
        this.starfield = { layers: [bgStars, brightStars, milkyWay] };
    }

    // --- Resize ---

    _onWindowResize() {
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    // --- Public API ---

    /**
     * Set the current game year (called by TimeManager)
     * @param {number} year - e.g. 2100.5 for mid-2100
     */
    setGameYear(year) {
        this.gameYear = year;
    }

    render() {
        if (!this.renderer) return;

        // Update controls (damping)
        if (this.controls) {
            this.controls.update();
        }

        // Sun rotation
        if (this.sun) {
            this.sun.rotation.y += 0.001;
        }

        // Update planet positions and rotations from game time
        const TWO_PI = Math.PI * 2;
        for (const [, planet] of this.planets) {
            // Orbital position from Keplerian elements
            const pos = computeOrbitalPosition(planet.elements, this.gameYear);
            planet.mesh.position.set(pos.x, pos.y, pos.z);

            // Self-rotation: absolute angle from game year
            // rotationsPerYear * gameYear * 2π = total angle
            const angle = planet.rotationsPerYear * this.gameYear * TWO_PI;
            planet.mesh.quaternion.setFromAxisAngle(planet.rotationAxis, angle);

            // Move extras (atmosphere, rings) to follow planet
            for (const extra of planet.extras) {
                extra.position.set(pos.x, pos.y, pos.z);
            }
        }

        this.renderer.render(this.scene, this.camera);
    }

    dispose() {
        window.removeEventListener('resize', this._boundResize);
        if (this.starfield?.layers) {
            for (const layer of this.starfield.layers) {
                layer.geometry.dispose();
                layer.material.dispose();
                this.scene.remove(layer);
            }
        }
        this.controls?.dispose();
        this.renderer?.dispose();
    }
}
