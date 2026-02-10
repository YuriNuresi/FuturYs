/**
 * SolarSystemRenderer - 3D Solar System Scene (Three.js)
 * Keplerian orbital mechanics with NASA JPL elements (J2000.0 epoch)
 * Procedural canvas-based textures for all planets
 * @version 4.0.0
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


// ============================================================
// Procedural Texture Generation (Canvas2D)
// ============================================================

/** Seeded pseudo-random (simple mulberry32) for reproducible textures */
function seededRandom(seed) {
    let t = seed + 0x6D2B79F5;
    return function () {
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Mix two CSS-style [r,g,b] colours by factor t (0..1) */
function mixColor(c1, c2, t) {
    return [
        Math.round(c1[0] + (c2[0] - c1[0]) * t),
        Math.round(c1[1] + (c2[1] - c1[1]) * t),
        Math.round(c1[2] + (c2[2] - c1[2]) * t)
    ];
}

function rgbStr(c) { return `rgb(${c[0]},${c[1]},${c[2]})`; }

/**
 * Generate a procedural equirectangular texture on a canvas
 * @param {number} w - canvas width
 * @param {number} h - canvas height
 * @param {function} pixelFn - (u, v, rng) => [r,g,b]  where u,v in [0,1]
 * @param {number} seed
 * @returns {HTMLCanvasElement}
 */
function generateTexture(w, h, pixelFn, seed) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(w, h);
    const rng = seededRandom(seed);

    for (let y = 0; y < h; y++) {
        const v = y / h; // 0 = north pole, 1 = south pole
        for (let x = 0; x < w; x++) {
            const u = x / w; // 0..1 longitude
            const [r, g, b] = pixelFn(u, v, rng);
            const i = (y * w + x) * 4;
            img.data[i] = r;
            img.data[i + 1] = g;
            img.data[i + 2] = b;
            img.data[i + 3] = 255;
        }
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
}

/** Simple 2D value noise (interpolated grid) */
function makeNoise2D(seed, gridSize) {
    const rng = seededRandom(seed);
    const grid = [];
    for (let i = 0; i < gridSize * gridSize; i++) grid.push(rng());

    return function (u, v) {
        const gx = u * (gridSize - 1);
        const gy = v * (gridSize - 1);
        const ix = Math.floor(gx);
        const iy = Math.floor(gy);
        const fx = gx - ix;
        const fy = gy - iy;

        const idx = (yy, xx) => grid[((yy % gridSize) * gridSize + (xx % gridSize)) % grid.length];
        const a = idx(iy, ix);
        const b = idx(iy, ix + 1);
        const c = idx(iy + 1, ix);
        const d = idx(iy + 1, ix + 1);

        const top = a + (b - a) * fx;
        const bot = c + (d - c) * fx;
        return top + (bot - top) * fy;
    };
}

/** Multi-octave fractal noise */
function fractalNoise(u, v, noises, octaves) {
    let val = 0, amp = 1, total = 0;
    for (let i = 0; i < octaves; i++) {
        const scale = Math.pow(2, i);
        val += noises[i % noises.length]((u * scale) % 1, (v * scale) % 1) * amp;
        total += amp;
        amp *= 0.5;
    }
    return val / total;
}

// --- Individual planet texture generators ---

function mercuryTexture() {
    const n1 = makeNoise2D(42, 32);
    const n2 = makeNoise2D(99, 64);
    const n3 = makeNoise2D(157, 16);
    const base = [140, 126, 109]; // grey-brown
    const dark = [80, 72, 62];
    const light = [170, 160, 145];

    return generateTexture(512, 256, (u, v, rng) => {
        const f = fractalNoise(u, v, [n1, n2, n3], 4);
        // Craters: bright spots surrounded by dark rings
        const crater = n2(u * 3 % 1, v * 3 % 1);
        let c = mixColor(dark, light, f);
        if (crater > 0.72) {
            c = mixColor(c, light, (crater - 0.72) * 3);
        } else if (crater > 0.65) {
            c = mixColor(c, dark, (crater - 0.65) * 5);
        }
        // Subtle noise grain
        const grain = (rng() - 0.5) * 12;
        return [c[0] + grain, c[1] + grain, c[2] + grain];
    }, 42);
}

function venusTexture() {
    const n1 = makeNoise2D(200, 24);
    const n2 = makeNoise2D(201, 48);
    const n3 = makeNoise2D(202, 12);
    const pale = [232, 205, 160]; // pale yellow
    const swirl = [210, 180, 130];
    const bright = [245, 225, 190];

    return generateTexture(512, 256, (u, v) => {
        // Swirling cloud bands
        const warp = n3(u, v) * 0.15;
        const f = fractalNoise((u + warp) % 1, v, [n1, n2], 3);
        const band = Math.sin(v * Math.PI * 8 + f * 4) * 0.5 + 0.5;
        let c = mixColor(swirl, bright, band * 0.6 + f * 0.4);
        // Slight latitude darkening at poles
        const poleFade = Math.pow(Math.sin(v * Math.PI), 0.3);
        c = mixColor([180, 155, 110], c, poleFade);
        return c;
    }, 200);
}

function earthTexture() {
    const n1 = makeNoise2D(300, 32);
    const n2 = makeNoise2D(301, 64);
    const n3 = makeNoise2D(302, 16);
    const n4 = makeNoise2D(303, 128);

    const ocean = [20, 60, 140];
    const oceanDeep = [10, 30, 100];
    const land = [40, 120, 50];
    const desert = [180, 160, 100];
    const mountain = [100, 85, 65];
    const ice = [230, 240, 250];

    return generateTexture(512, 256, (u, v) => {
        const f = fractalNoise(u, v, [n1, n2, n3], 5);
        const detail = n4(u * 4 % 1, v * 4 % 1);
        const lat = Math.abs(v - 0.5) * 2; // 0 = equator, 1 = pole

        // Ice caps
        if (lat > 0.85) {
            const iceFade = (lat - 0.85) / 0.15;
            return mixColor(ocean, ice, iceFade);
        }

        // Land vs ocean threshold
        if (f > 0.52) {
            // Land
            const elevation = (f - 0.52) / 0.48;
            let c;
            if (lat < 0.3 && elevation < 0.3) {
                // Tropical/temperate = green
                c = mixColor(land, [60, 140, 60], detail);
            } else if (lat > 0.5) {
                // Higher latitudes = darker greens / tundra
                c = mixColor([60, 90, 50], mountain, elevation);
            } else {
                // Mid latitudes: mix of green and desert
                c = mixColor(land, desert, elevation * 1.5);
            }
            // Mountains at high elevation
            if (elevation > 0.6) {
                c = mixColor(c, mountain, (elevation - 0.6) * 2.5);
            }
            return c;
        } else {
            // Ocean with depth variation
            const depth = (0.52 - f) / 0.52;
            return mixColor(ocean, oceanDeep, depth);
        }
    }, 300);
}

function marsTexture() {
    const n1 = makeNoise2D(400, 32);
    const n2 = makeNoise2D(401, 64);
    const n3 = makeNoise2D(402, 16);

    const rust = [193, 68, 14];
    const darkRed = [130, 45, 15];
    const sand = [210, 150, 90];
    const polar = [220, 210, 200];

    return generateTexture(512, 256, (u, v, rng) => {
        const f = fractalNoise(u, v, [n1, n2, n3], 4);
        const lat = Math.abs(v - 0.5) * 2;

        // Polar ice caps (smaller than Earth's)
        if (lat > 0.9) {
            const iceFade = (lat - 0.9) / 0.1;
            return mixColor(rust, polar, iceFade);
        }

        // Terrain variation: dark lowlands vs bright highlands
        let c;
        if (f > 0.55) {
            c = mixColor(rust, sand, (f - 0.55) * 3);
        } else {
            c = mixColor(darkRed, rust, f / 0.55);
        }
        // Valles Marineris-like dark streaks
        const streak = n2(u * 2 % 1, v * 0.5);
        if (streak > 0.7 && lat < 0.4) {
            c = mixColor(c, darkRed, (streak - 0.7) * 2);
        }
        const grain = (rng() - 0.5) * 8;
        return [c[0] + grain, c[1] + grain, c[2] + grain];
    }, 400);
}

function jupiterTexture() {
    const n1 = makeNoise2D(500, 48);
    const n2 = makeNoise2D(501, 24);
    const n3 = makeNoise2D(502, 96);

    const bands = [
        [200, 168, 122],  // light tan
        [170, 130, 80],   // darker tan
        [210, 185, 145],  // cream
        [150, 110, 60],   // brown
        [190, 155, 100],  // medium
        [220, 200, 160],  // pale
        [140, 100, 55],   // dark brown
        [200, 175, 130],  // warm tan
    ];

    return generateTexture(512, 256, (u, v) => {
        // Horizontal banding with turbulence
        const warp = n1(u, v) * 0.06;
        const bandIndex = ((v + warp) * bands.length * 2) % bands.length;
        const idx = Math.floor(bandIndex);
        const frac = bandIndex - idx;
        const c1 = bands[idx % bands.length];
        const c2 = bands[(idx + 1) % bands.length];
        let c = mixColor(c1, c2, frac);

        // Turbulent swirls
        const swirl = n3(u * 2 % 1, v * 3 % 1);
        const swirlColor = mixColor(c, bands[(idx + 3) % bands.length], swirl * 0.3);

        // Great Red Spot (approx at latitude 22S, longitude ~0.6)
        const spotLat = 0.62; // v coordinate (~22deg south)
        const spotLon = 0.6;
        const dx = (u - spotLon);
        const dy = (v - spotLat);
        const spotDist = Math.sqrt(dx * dx * 16 + dy * dy * 64);
        if (spotDist < 1.0) {
            const spotFade = 1 - spotDist;
            const spotColor = [180, 80, 40];
            return mixColor(swirlColor, spotColor, spotFade * 0.7);
        }

        return swirlColor;
    }, 500);
}

function saturnTexture() {
    const n1 = makeNoise2D(600, 48);
    const n2 = makeNoise2D(601, 24);

    const bands = [
        [212, 184, 106],  // gold
        [195, 170, 100],  // darker gold
        [225, 205, 155],  // pale gold
        [180, 155, 85],   // olive gold
        [215, 195, 140],  // light
        [200, 178, 110],  // medium
    ];

    return generateTexture(512, 256, (u, v) => {
        const warp = n1(u, v) * 0.04;
        const bandIndex = ((v + warp) * bands.length * 2.5) % bands.length;
        const idx = Math.floor(bandIndex);
        const frac = bandIndex - idx;
        const c1 = bands[idx % bands.length];
        const c2 = bands[(idx + 1) % bands.length];
        let c = mixColor(c1, c2, frac);

        // Subtle turbulence
        const turb = n2(u * 2 % 1, v * 2 % 1);
        c = mixColor(c, bands[(idx + 2) % bands.length], turb * 0.15);

        // Pole darkening
        const poleFade = Math.pow(Math.sin(v * Math.PI), 0.5);
        c = mixColor([160, 140, 80], c, poleFade);

        return c;
    }, 600);
}

function uranusTexture() {
    const n1 = makeNoise2D(700, 32);
    const n2 = makeNoise2D(701, 64);

    const base = [126, 200, 200]; // cyan-teal
    const light = [160, 220, 220];
    const pale = [180, 230, 230];
    const dark = [80, 160, 165];

    return generateTexture(512, 256, (u, v) => {
        const f = fractalNoise(u, v, [n1, n2], 3);
        // Very subtle banding (Uranus is quite uniform)
        const band = Math.sin(v * Math.PI * 6 + f * 2) * 0.5 + 0.5;
        let c = mixColor(dark, light, band * 0.4 + f * 0.3);

        // Slight pole brightening
        const poleFade = Math.pow(Math.sin(v * Math.PI), 0.6);
        c = mixColor(pale, c, poleFade);

        return c;
    }, 700);
}

function neptuneTexture() {
    const n1 = makeNoise2D(800, 32);
    const n2 = makeNoise2D(801, 64);
    const n3 = makeNoise2D(802, 16);

    const deepBlue = [30, 40, 140];
    const blue = [51, 68, 170];
    const lightBlue = [80, 110, 200];
    const streak = [100, 140, 220];

    return generateTexture(512, 256, (u, v) => {
        const f = fractalNoise(u, v, [n1, n2, n3], 4);
        // Banding
        const band = Math.sin(v * Math.PI * 8 + f * 3) * 0.5 + 0.5;
        let c = mixColor(deepBlue, blue, band * 0.5 + f * 0.3);

        // Storm bands / bright streaks (like the Great Dark Spot region)
        const stormNoise = n3(u * 2 % 1, v);
        if (stormNoise > 0.65 && v > 0.35 && v < 0.65) {
            c = mixColor(c, streak, (stormNoise - 0.65) * 2.5);
        }

        // White cloud wisps
        const cloud = n2(u * 3 % 1, v * 2 % 1);
        if (cloud > 0.75) {
            c = mixColor(c, lightBlue, (cloud - 0.75) * 3);
        }

        return c;
    }, 800);
}

/** Generate Saturn ring texture (radial gradient with gaps) */
function saturnRingTexture() {
    const w = 512, h = 16;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(w, h);
    const rng = seededRandom(650);

    for (let x = 0; x < w; x++) {
        const u = x / w; // 0 = inner edge, 1 = outer edge
        // Ring brightness profile with gaps
        let brightness;
        // B ring (bright, inner)
        if (u < 0.35) {
            brightness = 0.6 + u * 1.2;
        }
        // Cassini division (dark gap)
        else if (u < 0.42) {
            brightness = 0.1;
        }
        // A ring (medium bright)
        else if (u < 0.75) {
            brightness = 0.5 + Math.sin((u - 0.42) * 9) * 0.15;
        }
        // Encke gap
        else if (u < 0.78) {
            brightness = 0.15;
        }
        // Outer A ring / F ring
        else {
            brightness = 0.3 * (1 - (u - 0.78) / 0.22);
        }

        const noise = rng() * 0.08;
        brightness = Math.max(0, Math.min(1, brightness + noise));

        const r = Math.round(194 * brightness);
        const g = Math.round(165 * brightness);
        const b = Math.round(90 * brightness);
        const a = Math.round(brightness * 200);

        for (let y = 0; y < h; y++) {
            const i = (y * w + x) * 4;
            img.data[i] = r;
            img.data[i + 1] = g;
            img.data[i + 2] = b;
            img.data[i + 3] = a;
        }
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
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
        this.scene.background = new THREE.Color(0x020810);

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
     * @param {HTMLCanvasElement} opts.textureCanvas - procedural texture canvas
     * @param {number} opts.rotationPeriod - sidereal rotation period in Earth hours (negative = retrograde)
     * @param {number} opts.axialTilt - axial tilt in degrees
     * @param {THREE.Mesh[]} [opts.extras] - extra meshes (atmosphere, rings)
     */
    _addPlanet(name, { radius, textureCanvas, rotationPeriod, axialTilt, extras }) {
        const geo = new THREE.SphereGeometry(radius, 32, 32);
        const texture = new THREE.CanvasTexture(textureCanvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        const mat = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8, metalness: 0.1 });
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
            radius: 1.2, textureCanvas: mercuryTexture(),
            rotationPeriod: 1407.6, axialTilt: 0.034
        });
    }

    _createVenus() {
        this._addPlanet('venus', {
            radius: 2.8, textureCanvas: venusTexture(),
            rotationPeriod: -5832.5, axialTilt: 177.4
        });
    }

    _createEarth() {
        const atmoGeo = new THREE.SphereGeometry(3.3, 32, 32);
        const atmoMat = new THREE.MeshBasicMaterial({
            color: 0x88bbff, transparent: true, opacity: 0.15, side: THREE.BackSide
        });
        const atmosphere = new THREE.Mesh(atmoGeo, atmoMat);

        this._addPlanet('earth', {
            radius: 3, textureCanvas: earthTexture(),
            rotationPeriod: 23.93, axialTilt: 23.44, extras: [atmosphere]
        });
    }

    _createMars() {
        this._addPlanet('mars', {
            radius: 1.6, textureCanvas: marsTexture(),
            rotationPeriod: 24.62, axialTilt: 25.19
        });
    }

    _createJupiter() {
        this._addPlanet('jupiter', {
            radius: 6.5, textureCanvas: jupiterTexture(),
            rotationPeriod: 9.93, axialTilt: 3.13
        });
    }

    _createSaturn() {
        // Procedural ring with proper texture
        const ringGeo = new THREE.RingGeometry(7, 12, 64);
        // Fix UV mapping for ring (map u to radial distance)
        const pos = ringGeo.attributes.position;
        const uv = ringGeo.attributes.uv;
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const z = pos.getY(i);
            const dist = Math.sqrt(x * x + z * z);
            uv.setXY(i, (dist - 7) / 5, 0.5); // map radial dist to u
        }

        const ringCanvas = saturnRingTexture();
        const ringTex = new THREE.CanvasTexture(ringCanvas);
        ringTex.colorSpace = THREE.SRGBColorSpace;
        const ringMat = new THREE.MeshBasicMaterial({
            map: ringTex, transparent: true, side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI * 0.45;

        this._addPlanet('saturn', {
            radius: 5.5, textureCanvas: saturnTexture(),
            rotationPeriod: 10.66, axialTilt: 26.73, extras: [ring]
        });
    }

    _createUranus() {
        this._addPlanet('uranus', {
            radius: 4, textureCanvas: uranusTexture(),
            rotationPeriod: -17.24, axialTilt: 97.77
        });
    }

    _createNeptune() {
        this._addPlanet('neptune', {
            radius: 3.8, textureCanvas: neptuneTexture(),
            rotationPeriod: 16.11, axialTilt: 28.32
        });
    }

    _createStarfield() {
        const count = 2000;
        const positions = new Float32Array(count * 3);
        const radius = 20000;

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = radius * (0.8 + Math.random() * 0.2);
            positions[i3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i3 + 2] = r * Math.cos(phi);
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const material = new THREE.PointsMaterial({ color: 0xffffff, size: 1.5, sizeAttenuation: true });

        this.starfield = new THREE.Points(geometry, material);
        this.scene.add(this.starfield);
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
            // rotationsPerYear * gameYear * 2pi = total angle
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
        this.controls?.dispose();
        this.renderer?.dispose();
    }
}
