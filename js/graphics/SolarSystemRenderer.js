/**
 * SolarSystemRenderer - 3D Solar System Scene (Three.js)
 * Keplerian orbital mechanics with NASA JPL elements (J2000.0 epoch)
 * Procedural canvas-based textures for all planets
 * @version 4.0.0
 * TEST_MARKER_2025_02_10_v2 - Se vedi questo marker in console, stai leggendo il file corretto!
 */

console.log('✓ SolarSystemRenderer CORRETTO caricato - NO seededRandom duplicato!');

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// === Procedural Texture Generator ===

const TEX_W = 512;
const TEX_H = 256;

function createCanvas() {
    const c = document.createElement('canvas');
    c.width = TEX_W;
    c.height = TEX_H;
    return c;
}

/** Seeded pseudo-random (simple mulberry32) */
function seededRandom(seed) {
    let s = seed | 0;
    return function() {
        s = (s + 0x6D2B79F5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Simple 2D value noise */
function valueNoise(x, y, rand) {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const hash = (a, b) => {
        const n = (a * 374761393 + b * 668265263 + 1013904223) & 0x7fffffff;
        return (n * n * n * 60493) / 2147483648.0 % 1;
    };
    const v00 = hash(ix, iy), v10 = hash(ix+1, iy);
    const v01 = hash(ix, iy+1), v11 = hash(ix+1, iy+1);
    const top = v00 + (v10 - v00) * sx;
    const bot = v01 + (v11 - v01) * sx;
    return top + (bot - top) * sy;
}

/** Fractional Brownian motion (fBm) */
function fbm(x, y, octaves, rand) {
    let val = 0, amp = 0.5, freq = 1;
    for (let i = 0; i < octaves; i++) {
        val += amp * valueNoise(x * freq, y * freq, rand);
        amp *= 0.5;
        freq *= 2;
    }
    return val;
}

function lerpColor(r1,g1,b1, r2,g2,b2, t) {
    return [
        r1 + (r2 - r1) * t,
        g1 + (g2 - g1) * t,
        b1 + (b2 - b1) * t
    ];
}

// --- Mercury: grey rocky surface with craters ---
function generateMercuryTexture() {
    const c = createCanvas(), ctx = c.getContext('2d');
    const rand = seededRandom(111);
    const img = ctx.createImageData(TEX_W, TEX_H);
    for (let y = 0; y < TEX_H; y++) {
        for (let x = 0; x < TEX_W; x++) {
            const n = fbm(x / 60, y / 60, 5, rand);
            const base = 100 + n * 80;
            const i = (y * TEX_W + x) * 4;
            img.data[i] = base * 0.95;
            img.data[i+1] = base * 0.90;
            img.data[i+2] = base * 0.82;
            img.data[i+3] = 255;
        }
    }
    ctx.putImageData(img, 0, 0);
    // craters
    const craterCount = 80;
    for (let i = 0; i < craterCount; i++) {
        const cx = rand() * TEX_W, cy = rand() * TEX_H;
        const r = 2 + rand() * 12;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(60,55,45,${0.15 + rand() * 0.25})`;
        ctx.fill();
        // rim highlight
        ctx.beginPath();
        ctx.arc(cx - r*0.2, cy - r*0.2, r * 0.85, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(180,170,150,${0.15 + rand() * 0.15})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
    }
    return new THREE.CanvasTexture(c);
}

// --- Venus: thick yellow-orange clouds with swirl patterns ---
function generateVenusTexture() {
    const c = createCanvas(), ctx = c.getContext('2d');
    const img = ctx.createImageData(TEX_W, TEX_H);
    for (let y = 0; y < TEX_H; y++) {
        for (let x = 0; x < TEX_W; x++) {
            const lat = y / TEX_H;
            const n1 = fbm(x / 80 + lat * 2, y / 40, 5, null);
            const n2 = fbm(x / 50 + 10, y / 30 + 5, 4, null);
            const swirl = n1 * 0.6 + n2 * 0.4;
            const r = 200 + swirl * 55;
            const g = 170 + swirl * 45;
            const b = 100 + swirl * 30;
            const i = (y * TEX_W + x) * 4;
            img.data[i] = Math.min(255, r);
            img.data[i+1] = Math.min(255, g);
            img.data[i+2] = Math.min(255, b);
            img.data[i+3] = 255;
        }
    }
    ctx.putImageData(img, 0, 0);
    return new THREE.CanvasTexture(c);
}

// --- Earth: oceans, continents, polar caps ---
function generateEarthTexture() {
    const c = createCanvas(), ctx = c.getContext('2d');
    const img = ctx.createImageData(TEX_W, TEX_H);
    for (let y = 0; y < TEX_H; y++) {
        const lat = (y / TEX_H - 0.5) * 2; // -1 to 1
        for (let x = 0; x < TEX_W; x++) {
            const n = fbm(x / 70, y / 70, 6, null);
            const n2 = fbm(x / 40 + 100, y / 40 + 100, 4, null);
            const landThreshold = 0.42 + Math.abs(lat) * 0.05;
            const isLand = (n * 0.7 + n2 * 0.3) > landThreshold;
            const polar = Math.abs(lat) > 0.82;
            let r, g, b;
            if (polar) {
                r = 230 + n * 25; g = 235 + n * 20; b = 240 + n * 15;
            } else if (isLand) {
                const elevation = n * 0.7 + n2 * 0.3 - landThreshold;
                if (elevation > 0.2) {
                    // mountains
                    r = 140 + n * 40; g = 120 + n * 30; b = 80 + n * 20;
                } else if (Math.abs(lat) < 0.25) {
                    // tropical green
                    r = 50 + n * 40; g = 120 + n * 50; b = 40 + n * 20;
                } else {
                    // temperate green/brown
                    r = 80 + n * 50; g = 130 + n * 40; b = 50 + n * 25;
                }
            } else {
                // ocean
                const depth = n * 0.3;
                r = 15 + depth * 30; g = 50 + depth * 50; b = 140 + depth * 60;
            }
            const i4 = (y * TEX_W + x) * 4;
            img.data[i4] = Math.min(255, r);
            img.data[i4+1] = Math.min(255, g);
            img.data[i4+2] = Math.min(255, b);
            img.data[i4+3] = 255;
        }
    }
    ctx.putImageData(img, 0, 0);
    return new THREE.CanvasTexture(c);
}

// --- Mars: red/orange terrain with dark regions, polar caps ---
function generateMarsTexture() {
    const c = createCanvas(), ctx = c.getContext('2d');
    const img = ctx.createImageData(TEX_W, TEX_H);
    for (let y = 0; y < TEX_H; y++) {
        const lat = (y / TEX_H - 0.5) * 2;
        for (let x = 0; x < TEX_W; x++) {
            const n = fbm(x / 60, y / 60, 5, null);
            const n2 = fbm(x / 35 + 50, y / 35 + 50, 4, null);
            const polar = Math.abs(lat) > 0.88;
            let r, g, b;
            if (polar) {
                r = 220 + n * 35; g = 215 + n * 30; b = 210 + n * 25;
            } else {
                const dark = n2 > 0.55;
                if (dark) {
                    r = 120 + n * 40; g = 60 + n * 25; b = 30 + n * 15;
                } else {
                    r = 190 + n * 50; g = 110 + n * 35; b = 60 + n * 20;
                }
            }
            const i4 = (y * TEX_W + x) * 4;
            img.data[i4] = Math.min(255, r);
            img.data[i4+1] = Math.min(255, g);
            img.data[i4+2] = Math.min(255, b);
            img.data[i4+3] = 255;
        }
    }
    ctx.putImageData(img, 0, 0);
    return new THREE.CanvasTexture(c);
}

// --- Jupiter: horizontal bands with Great Red Spot ---
function generateJupiterTexture() {
    const c = createCanvas(), ctx = c.getContext('2d');
    const img = ctx.createImageData(TEX_W, TEX_H);
    // Band colors: alternating cream/orange/brown
    const bands = [
        [210,190,150], [180,140,90], [220,200,160], [160,120,80],
        [230,210,170], [190,150,100], [200,170,130], [170,130,85],
        [225,205,165], [185,145,95], [215,195,155], [165,125,82]
    ];
    for (let y = 0; y < TEX_H; y++) {
        const lat = y / TEX_H;
        const bandIdx = Math.floor(lat * bands.length);
        const nextIdx = Math.min(bandIdx + 1, bands.length - 1);
        const t = (lat * bands.length) - bandIdx;
        const bc = lerpColor(...bands[bandIdx], ...bands[nextIdx], t);
        for (let x = 0; x < TEX_W; x++) {
            const n = fbm(x / 100 + lat * 3, y / 20, 4, null);
            const turb = fbm(x / 40, y / 15 + 200, 3, null) * 15;
            let r = bc[0] + n * 30 + turb;
            let g = bc[1] + n * 20 + turb * 0.6;
            let b = bc[2] + n * 10;
            // Great Red Spot (around 22% south, 60% longitude)
            const dx = (x / TEX_W - 0.6) * TEX_W;
            const dy = (y / TEX_H - 0.65) * TEX_H;
            const spotDist = Math.sqrt(dx*dx*0.6 + dy*dy*1.5);
            if (spotDist < 22) {
                const spotT = 1 - spotDist / 22;
                const spotIntensity = spotT * spotT;
                r = r + (200 - r) * spotIntensity * 0.7;
                g = g + (80 - g) * spotIntensity * 0.7;
                b = b + (60 - b) * spotIntensity * 0.7;
            }
            const i4 = (y * TEX_W + x) * 4;
            img.data[i4] = Math.min(255, Math.max(0, r));
            img.data[i4+1] = Math.min(255, Math.max(0, g));
            img.data[i4+2] = Math.min(255, Math.max(0, b));
            img.data[i4+3] = 255;
        }
    }
    ctx.putImageData(img, 0, 0);
    return new THREE.CanvasTexture(c);
}

// --- Saturn: horizontal bands in gold/cream ---
function generateSaturnTexture() {
    const c = createCanvas(), ctx = c.getContext('2d');
    const img = ctx.createImageData(TEX_W, TEX_H);
    const bands = [
        [220,200,150], [200,180,130], [230,215,170], [190,170,120],
        [225,210,160], [205,185,135], [215,195,145], [195,175,125],
        [228,212,165], [198,178,128]
    ];
    for (let y = 0; y < TEX_H; y++) {
        const lat = y / TEX_H;
        const bandIdx = Math.floor(lat * bands.length);
        const nextIdx = Math.min(bandIdx + 1, bands.length - 1);
        const t = (lat * bands.length) - bandIdx;
        const bc = lerpColor(...bands[bandIdx], ...bands[nextIdx], t);
        for (let x = 0; x < TEX_W; x++) {
            const n = fbm(x / 120, y / 25, 4, null);
            const r = bc[0] + n * 25;
            const g = bc[1] + n * 20;
            const b = bc[2] + n * 10;
            const i4 = (y * TEX_W + x) * 4;
            img.data[i4] = Math.min(255, r);
            img.data[i4+1] = Math.min(255, g);
            img.data[i4+2] = Math.min(255, b);
            img.data[i4+3] = 255;
        }
    }
    ctx.putImageData(img, 0, 0);
    return new THREE.CanvasTexture(c);
}

// --- Saturn Ring texture ---
function generateSaturnRingTexture() {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 64;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(512, 64);
    const rand = seededRandom(777);
    for (let x = 0; x < 512; x++) {
        const u = x / 512; // 0=inner, 1=outer
        const n = fbm(x / 30, 0, 3, null);
        // Multiple ring bands with gaps
        const gap1 = (u > 0.38 && u < 0.42) ? 0.1 : 1.0;  // Cassini division
        const gap2 = (u > 0.18 && u < 0.20) ? 0.3 : 1.0;
        const brightness = (160 + n * 60) * gap1 * gap2;
        const alpha = (u < 0.05 || u > 0.95) ? 0 : (180 + n * 50) * gap1 * gap2;
        for (let y = 0; y < 64; y++) {
            const i4 = (y * 512 + x) * 4;
            img.data[i4] = Math.min(255, brightness * 1.1);
            img.data[i4+1] = Math.min(255, brightness * 0.95);
            img.data[i4+2] = Math.min(255, brightness * 0.75);
            img.data[i4+3] = Math.min(255, Math.max(0, alpha));
        }
    }
    ctx.putImageData(img, 0, 0);
    return new THREE.CanvasTexture(c);
}

// --- Uranus: subtle cyan/teal bands ---
function generateUranusTexture() {
    const c = createCanvas(), ctx = c.getContext('2d');
    const img = ctx.createImageData(TEX_W, TEX_H);
    for (let y = 0; y < TEX_H; y++) {
        const lat = y / TEX_H;
        for (let x = 0; x < TEX_W; x++) {
            const n = fbm(x / 150, y / 30, 3, null);
            const band = Math.sin(lat * Math.PI * 8) * 10;
            const r = 100 + n * 30 + band * 0.3;
            const g = 185 + n * 25 + band * 0.5;
            const b = 195 + n * 20 + band * 0.4;
            const i4 = (y * TEX_W + x) * 4;
            img.data[i4] = Math.min(255, Math.max(0, r));
            img.data[i4+1] = Math.min(255, Math.max(0, g));
            img.data[i4+2] = Math.min(255, Math.max(0, b));
            img.data[i4+3] = 255;
        }
    }
    ctx.putImageData(img, 0, 0);
    return new THREE.CanvasTexture(c);
}

// --- Neptune: deep blue with darker bands and a dark spot ---
function generateNeptuneTexture() {
    const c = createCanvas(), ctx = c.getContext('2d');
    const img = ctx.createImageData(TEX_W, TEX_H);
    for (let y = 0; y < TEX_H; y++) {
        const lat = y / TEX_H;
        for (let x = 0; x < TEX_W; x++) {
            const n = fbm(x / 100, y / 25, 4, null);
            const band = Math.sin(lat * Math.PI * 10) * 12;
            let r = 30 + n * 25 + band * 0.2;
            let g = 50 + n * 30 + band * 0.4;
            let b = 160 + n * 40 + band * 0.5;
            // Great Dark Spot (around 30% south, 40% longitude)
            const dx = (x / TEX_W - 0.4) * TEX_W;
            const dy = (y / TEX_H - 0.62) * TEX_H;
            const spotDist = Math.sqrt(dx*dx*0.8 + dy*dy*2);
            if (spotDist < 18) {
                const spotT = 1 - spotDist / 18;
                const dark = spotT * spotT * 0.5;
                r *= (1 - dark);
                g *= (1 - dark);
                b *= (1 - dark * 0.4);
            }
            const i4 = (y * TEX_W + x) * 4;
            img.data[i4] = Math.min(255, Math.max(0, r));
            img.data[i4+1] = Math.min(255, Math.max(0, g));
            img.data[i4+2] = Math.min(255, Math.max(0, b));
            img.data[i4+3] = 255;
        }
    }
    ctx.putImageData(img, 0, 0);
    return new THREE.CanvasTexture(c);
}

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

// Geometry segments by planet size tier (small, medium, large)
const SEGMENTS = { small: 24, medium: 32, large: 40 };
const PLANET_SEGMENTS = {
    mercury: SEGMENTS.small, venus: SEGMENTS.medium, earth: SEGMENTS.medium,
    mars: SEGMENTS.small, jupiter: SEGMENTS.large, saturn: SEGMENTS.large,
    uranus: SEGMENTS.medium, neptune: SEGMENTS.medium
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
 * Pre-compute the constant rotation matrix coefficients for each planet.
 * These depend only on orbital elements (wbar, omega, I) which are fixed.
 * Returns { Ax, Bx, Ay, By, Az, Bz, n, L0, e, scale } where:
 *   x = Ax*xPrime + Bx*yPrime, etc.  (in scene units)
 */
function precomputeOrbitalCoeffs(elements) {
    const { a, e, I, L0, wbar, omega, period } = elements;

    const w = degToRad(wbar - omega);
    const Om = degToRad(omega);
    const inc = degToRad(I);

    const cosW = Math.cos(w), sinW = Math.sin(w);
    const cosOm = Math.cos(Om), sinOm = Math.sin(Om);
    const cosI = Math.cos(inc), sinI = Math.sin(inc);

    const scale = auToScene(a) / a;

    // Ecliptic x,y,z coefficients (pre-scaled, with Y-up swap baked in)
    return {
        // scene X = ecliptic x * scale
        Ax: (cosW * cosOm - sinW * sinOm * cosI) * scale,
        Bx: (-sinW * cosOm - cosW * sinOm * cosI) * scale,
        // scene Y = ecliptic z * scale  (Y-up swap)
        Ay: (sinW * sinI) * scale,
        By: (cosW * sinI) * scale,
        // scene Z = -ecliptic y * scale  (Y-up swap)
        Az: -(cosW * sinOm + sinW * cosOm * cosI) * scale,
        Bz: -(-sinW * sinOm + cosW * cosOm * cosI) * scale,
        n: 360 / period,   // mean motion (deg/year)
        L0, wbar, e, a
    };
}

// Pre-compute coefficients once at module load
const ORBITAL_COEFFS = {};
for (const name in ORBITAL_ELEMENTS) {
    ORBITAL_COEFFS[name] = precomputeOrbitalCoeffs(ORBITAL_ELEMENTS[name]);
}

/**
 * Compute heliocentric position using pre-computed coefficients.
 * Only Kepler solve + 2 trig calls remain per frame.
 */
function computeOrbitalPosition(coeffs, year) {
    const { Ax, Bx, Ay, By, Az, Bz, n, L0, wbar, e, a } = coeffs;

    const dt = year - 2000.0;
    const L = (L0 + n * dt) % 360;
    const M = degToRad(((L - wbar) % 360 + 360) % 360);
    const E = solveKepler(M, e);

    const xPrime = a * (Math.cos(E) - e);
    const yPrime = a * Math.sqrt(1 - e * e) * Math.sin(E);

    return {
        x: Ax * xPrime + Bx * yPrime,
        y: Ay * xPrime + By * yPrime,
        z: Az * xPrime + Bz * yPrime
    };
}


// Orbital update interval: recompute Kepler every N frames (at 60fps → ~15 Hz)
const ORBIT_UPDATE_EVERY = 4;

// Max pointer movement (px) to still count as a click (not a drag)
const CLICK_THRESHOLD = 5;

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

        // Scene objects
        this.planets = new Map();
        this.sun = null;
        this.starfield = null;

        // Raycaster for planet selection
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this._mouse = new THREE.Vector2();
        this._raycaster = new THREE.Raycaster();

        // Interaction state
        this._pointerDown = null;
        this._hoveredPlanet = null;
        this.selectedPlanet = null;
        this._selectionRing = null;
        this._frameCount = 0;

        // Game time — updated externally by TimeManager
        this.gameYear = 2100;

        this._boundResize = this._onWindowResize.bind(this);
        this._boundPointerDown = this._onPointerDown.bind(this);
        this._boundPointerUp = this._onPointerUp.bind(this);
        this._boundPointerMove = this._onPointerMove.bind(this);
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
        this._setupInteraction();

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
     * @param {HTMLCanvasElement} opts.textureCanvas - procedural texture canvas
     * @param {number} opts.rotationPeriod - sidereal rotation period in Earth hours (negative = retrograde)
     * @param {number} opts.axialTilt - axial tilt in degrees
     * @param {THREE.Mesh[]} [opts.extras] - extra meshes (atmosphere, rings) added to group
     */
    _addPlanet(name, { radius, textureCanvas, rotationPeriod, axialTilt, extras }) {
        const geo = new THREE.SphereGeometry(radius, 32, 32);
        const texture = new THREE.CanvasTexture(textureCanvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        const mat = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8, metalness: 0.1 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.name = name;

        // Group planet + extras so position sync is automatic
        const group = new THREE.Group();
        group.add(mesh);
        const extraMeshes = extras || [];
        extraMeshes.forEach(m => group.add(m));
        this.scene.add(group);

        // Pre-compute tilted rotation axis
        const tilt = degToRad(axialTilt || 0);
        const rotationAxis = new THREE.Vector3(Math.sin(tilt), Math.cos(tilt), 0).normalize();

        const rotationsPerYear = (365.25 * 24) / rotationPeriod;

        this.planets.set(name, {
            mesh, group, rotationAxis, rotationsPerYear,
            coeffs: ORBITAL_COEFFS[name]
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
        const atmoGeo = new THREE.SphereGeometry(3.3, 48, 48);
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

    // --- Interaction (raycasting) ---

    _setupInteraction() {
        // Selection ring: wireframe torus shown around selected planet
        const ringGeo = new THREE.TorusGeometry(1, 0.08, 8, 48);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x4fd1c7, transparent: true, opacity: 0.8
        });
        this._selectionRing = new THREE.Mesh(ringGeo, ringMat);
        this._selectionRing.rotation.x = Math.PI / 2;
        this._selectionRing.visible = false;
        this.scene.add(this._selectionRing);

        this.canvas.addEventListener('pointerdown', this._boundPointerDown);
        this.canvas.addEventListener('pointerup', this._boundPointerUp);
        this.canvas.addEventListener('pointermove', this._boundPointerMove);
    }

    _getNDC(event) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
            y: -((event.clientY - rect.top) / rect.height) * 2 + 1
        };
    }

    _getPlanetMeshes() {
        const meshes = [];
        for (const [, planet] of this.planets) {
            meshes.push(planet.mesh);
        }
        return meshes;
    }

    _raycastPlanets(ndcX, ndcY) {
        this._mouse.set(ndcX, ndcY);
        this._raycaster.setFromCamera(this._mouse, this.camera);
        const hits = this._raycaster.intersectObjects(this._getPlanetMeshes(), false);
        return hits.length > 0 ? hits[0].object.name : null;
    }

    _onPointerDown(event) {
        if (event.button !== 0) return; // left click only
        this._pointerDown = { x: event.clientX, y: event.clientY };
    }

    _onPointerUp(event) {
        if (event.button !== 0 || !this._pointerDown) return;

        const dx = event.clientX - this._pointerDown.x;
        const dy = event.clientY - this._pointerDown.y;
        this._pointerDown = null;

        // Ignore if pointer moved too much (it was a drag/rotate)
        if (Math.sqrt(dx * dx + dy * dy) > CLICK_THRESHOLD) return;

        const ndc = this._getNDC(event);
        const hitName = this._raycastPlanets(ndc.x, ndc.y);

        if (hitName) {
            this.selectPlanet(hitName);
        } else {
            this.deselectPlanet();
        }
    }

    _onPointerMove(event) {
        const ndc = this._getNDC(event);
        const hitName = this._raycastPlanets(ndc.x, ndc.y);

        if (hitName !== this._hoveredPlanet) {
            this._hoveredPlanet = hitName;
            this.canvas.style.cursor = hitName ? 'pointer' : '';
        }
    }

    /**
     * Programmatically select a planet by name
     * @param {string} name - planet name (e.g. 'earth')
     */
    selectPlanet(name) {
        const planet = this.planets.get(name);
        if (!planet) return;

        this.selectedPlanet = name;

        // Scale selection ring to planet radius (read from geometry)
        const radius = planet.mesh.geometry.parameters.radius;
        const ringScale = radius * 1.6;
        this._selectionRing.scale.set(ringScale, ringScale, ringScale);
        this._selectionRing.visible = true;

        // Get full planet info and pass to callback
        if (this.onPlanetClick) {
            const planetInfo = this._getPlanetInfo(name, planet);
            this.onPlanetClick(planetInfo);
        }
    }

    deselectPlanet() {
        if (!this.selectedPlanet) return;
        this.selectedPlanet = null;
        this._selectionRing.visible = false;
        if (this.onPlanetClick) {
            this.onPlanetClick(null);
        }
    }

    // --- Resize (debounced) ---

    _onWindowResize() {
        this._onResizeDebounced();
    }

    _onResizeDebounced() {
        clearTimeout(this._resizeTimer);
        this._resizeTimer = setTimeout(() => this._applyResize(), 150);
    }

    _applyResize() {
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;
        if (width === 0 || height === 0) return;
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

        this.controls?.update();

        if (this.sun) {
            this.sun.rotation.y += 0.001;
        }

        this._frameCount++;
        const updateOrbits = (this._frameCount % ORBIT_UPDATE_EVERY) === 0;
        const TWO_PI = Math.PI * 2;

        for (const [, planet] of this.planets) {
            // Orbital position — throttled (Kepler solve is expensive)
            if (updateOrbits) {
                const pos = computeOrbitalPosition(planet.coeffs, this.gameYear);
                planet.group.position.set(pos.x, pos.y, pos.z);
            }

            // Self-rotation: absolute angle from game year
            // rotationsPerYear * gameYear * 2pi = total angle
            const angle = planet.rotationsPerYear * this.gameYear * TWO_PI;
            planet.mesh.quaternion.setFromAxisAngle(planet.rotationAxis, angle);
        }

        // Update selection ring position
        if (this._selectionRing.visible && this.selectedPlanet) {
            const sel = this.planets.get(this.selectedPlanet);
            if (sel) {
                const wp = sel.group.position;
                this._selectionRing.position.set(wp.x, wp.y, wp.z);
                // Rotate ring to always face camera
                this._selectionRing.lookAt(this.camera.position);
            }
        }

        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Get detailed information about a planet
     */
    _getPlanetInfo(name, planetData) {
        const { coeffs } = planetData;
        const pos = computeOrbitalPosition(coeffs, this.gameYear);

        // Calculate distance from Earth
        const earthData = this.planets.get('earth');
        const earthPos = computeOrbitalPosition(earthData.coeffs, this.gameYear);
        const dx = pos.x - earthPos.x;
        const dy = pos.y - earthPos.y;
        const dz = pos.z - earthPos.z;
        const distanceFromEarth = Math.sqrt(dx * dx + dy * dy + dz * dz);

        // Distance from Sun in AU
        const distanceFromSun = coeffs.a;

        // Estimated travel time (simplified: assuming constant velocity of 50,000 km/h)
        // Convert scene units back to AU, then to km, then calculate time
        const distanceAU = distanceFromEarth * coeffs.a / auToScene(coeffs.a);
        const distanceKm = distanceAU * 149597870.7; // 1 AU in km
        const velocityKmH = 50000;
        const travelTimeHours = distanceKm / velocityKmH;
        const travelTimeDays = travelTimeHours / 24;

        // Planet data
        const planetDetails = {
            mercury: { mass: '3.3×10²³ kg', diameter: '4,879 km', type: 'Rocky', moons: 0, description: 'Closest planet to the Sun, extreme temperatures' },
            venus: { mass: '4.87×10²⁴ kg', diameter: '12,104 km', type: 'Rocky', moons: 0, description: 'Hottest planet, thick toxic atmosphere' },
            earth: { mass: '5.97×10²⁴ kg', diameter: '12,742 km', type: 'Rocky', moons: 1, description: 'Our home planet, only known planet with life' },
            mars: { mass: '6.42×10²³ kg', diameter: '6,779 km', type: 'Rocky', moons: 2, description: 'The Red Planet, target for colonization' },
            jupiter: { mass: '1.90×10²⁷ kg', diameter: '139,820 km', type: 'Gas Giant', moons: 95, description: 'Largest planet, powerful magnetic field' },
            saturn: { mass: '5.68×10²⁶ kg', diameter: '116,460 km', type: 'Gas Giant', moons: 146, description: 'Famous for its spectacular ring system' },
            uranus: { mass: '8.68×10²⁵ kg', diameter: '50,724 km', type: 'Ice Giant', moons: 28, description: 'Tilted on its side, pale blue color' },
            neptune: { mass: '1.02×10²⁶ kg', diameter: '49,244 km', type: 'Ice Giant', moons: 16, description: 'Windiest planet, deep blue color' }
        };

        const details = planetDetails[name] || {};

        return {
            name: name.charAt(0).toUpperCase() + name.slice(1),
            mass: details.mass,
            diameter: details.diameter,
            type: details.type,
            moons: details.moons,
            description: details.description,
            distanceFromSun: distanceFromSun.toFixed(2) + ' AU',
            distanceFromEarth: distanceAU.toFixed(2) + ' AU',
            travelTime: travelTimeDays.toFixed(1) + ' days',
            orbitalPeriod: (360 / coeffs.n).toFixed(2) + ' years',
            eccentricity: coeffs.e.toFixed(3)
        };
    }

    dispose() {
        window.removeEventListener('resize', this._boundResize);
        this.canvas.removeEventListener('pointerdown', this._boundPointerDown);
        this.canvas.removeEventListener('pointerup', this._boundPointerUp);
        this.canvas.removeEventListener('pointermove', this._boundPointerMove);
        this.controls?.dispose();
        this.renderer?.dispose();
    }
}
