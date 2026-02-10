/**
 * SolarSystemRenderer - 3D Solar System Scene (Three.js)
 * card_101: Initialize Three.js scene with lighting, camera, resize handler
 * @version 2.0.0
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

export class SolarSystemRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.onPlanetClick = null;

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = new THREE.Clock();

        // Scene objects
        this.planets = new Map();
        this.sun = null;
        this.starfield = null;

        this._boundResize = this._onWindowResize.bind(this);
    }

    async init() {
        console.log('Initializing 3D Solar System...');

        this._setupRenderer();
        this._setupCamera();
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

    _setupLighting() {
        // Ambient light — faint fill so dark sides aren't pure black
        const ambient = new THREE.AmbientLight(0x111122, 0.3);
        this.scene.add(ambient);

        // Sun point light — main light source at origin
        const sunLight = new THREE.PointLight(0xffffff, 2.0, 0, 0.5);
        sunLight.position.set(0, 0, 0);
        this.scene.add(sunLight);
    }

    _createSun() {
        const sunGroup = new THREE.Group();

        // Core sphere — self-lit, unaffected by scene lighting
        const coreGeo = new THREE.SphereGeometry(8, 64, 64);
        const coreMat = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
        const core = new THREE.Mesh(coreGeo, coreMat);
        sunGroup.add(core);

        // Inner glow layer
        const glowGeo = new THREE.SphereGeometry(9.5, 32, 32);
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0xffaa00,
            transparent: true,
            opacity: 0.3,
            side: THREE.BackSide
        });
        sunGroup.add(new THREE.Mesh(glowGeo, glowMat));

        // Outer corona
        const coronaGeo = new THREE.SphereGeometry(12, 32, 32);
        const coronaMat = new THREE.MeshBasicMaterial({
            color: 0xff6600,
            transparent: true,
            opacity: 0.1,
            side: THREE.BackSide
        });
        sunGroup.add(new THREE.Mesh(coronaGeo, coronaMat));

        this.sun = sunGroup;
        this.scene.add(this.sun);
    }

    // --- Planets ---

    /**
     * Helper: add a planet to the scene
     * @param {string} name - Planet identifier
     * @param {object} opts - { radius, color, distance, orbitalSpeed, rotationSpeed }
     */
    _addPlanet(name, { radius, color, distance, orbitalSpeed, rotationSpeed }) {
        // Pivot group for orbital movement
        const pivot = new THREE.Group();

        // Planet mesh — lit by the Sun's PointLight
        const geo = new THREE.SphereGeometry(radius, 32, 32);
        const mat = new THREE.MeshStandardMaterial({
            color,
            roughness: 0.8,
            metalness: 0.1
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.x = distance;
        mesh.name = name;
        pivot.add(mesh);

        this.scene.add(pivot);
        this.planets.set(name, { mesh, pivot, distance, orbitalSpeed, rotationSpeed });
    }

    _createMercury() {
        this._addPlanet('mercury', {
            radius: 1.2,
            color: 0x8c7e6d,
            distance: 25,
            orbitalSpeed: 0.004,
            rotationSpeed: 0.002
        });
    }

    _createEarth() {
        // Pivot for orbit
        const pivot = new THREE.Group();

        // Earth sphere
        const geo = new THREE.SphereGeometry(3, 64, 64);
        const mat = new THREE.MeshStandardMaterial({
            color: 0x2266aa,
            roughness: 0.7,
            metalness: 0.1
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.x = 55;
        mesh.name = 'earth';

        // Atmosphere glow
        const atmoGeo = new THREE.SphereGeometry(3.3, 32, 32);
        const atmoMat = new THREE.MeshBasicMaterial({
            color: 0x88bbff,
            transparent: true,
            opacity: 0.15,
            side: THREE.BackSide
        });
        const atmosphere = new THREE.Mesh(atmoGeo, atmoMat);
        atmosphere.position.copy(mesh.position);

        pivot.add(mesh);
        pivot.add(atmosphere);
        this.scene.add(pivot);

        this.planets.set('earth', {
            mesh, pivot,
            distance: 55,
            orbitalSpeed: 0.001,
            rotationSpeed: 0.003
        });
    }

    _createMars() {
        this._addPlanet('mars', {
            radius: 1.6,
            color: 0xc1440e,
            distance: 75,
            orbitalSpeed: 0.0008,
            rotationSpeed: 0.003
        });
    }

    _createJupiter() {
        this._addPlanet('jupiter', {
            radius: 6.5,
            color: 0xc8a87a,
            distance: 120,
            orbitalSpeed: 0.0004,
            rotationSpeed: 0.006
        });
    }

    _createSaturn() {
        const pivot = new THREE.Group();

        // Planet body
        const geo = new THREE.SphereGeometry(5.5, 64, 64);
        const mat = new THREE.MeshStandardMaterial({
            color: 0xd4b86a,
            roughness: 0.7,
            metalness: 0.1
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.x = 170;
        mesh.name = 'saturn';

        // Ring system
        const ringGeo = new THREE.RingGeometry(7, 12, 64);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0xc2a55a,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.copy(mesh.position);
        ring.rotation.x = Math.PI * 0.45;

        pivot.add(mesh);
        pivot.add(ring);
        this.scene.add(pivot);

        this.planets.set('saturn', {
            mesh, pivot,
            distance: 170,
            orbitalSpeed: 0.0003,
            rotationSpeed: 0.005
        });
    }

    _createUranus() {
        this._addPlanet('uranus', {
            radius: 4,
            color: 0x7ec8c8,
            distance: 230,
            orbitalSpeed: 0.0002,
            rotationSpeed: -0.004  // retrograde rotation
        });
    }

    _createNeptune() {
        this._addPlanet('neptune', {
            radius: 3.8,
            color: 0x3344aa,
            distance: 290,
            orbitalSpeed: 0.00015,
            rotationSpeed: 0.004
        });
    }

    _createVenus() {
        this._addPlanet('venus', {
            radius: 2.8,
            color: 0xe8cda0,
            distance: 40,
            orbitalSpeed: 0.0015,
            rotationSpeed: -0.0005  // retrograde rotation
        });
    }

    _createStarfield() {
        const count = 2000;
        const positions = new Float32Array(count * 3);
        const radius = 20000;

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            // Distribute on a sphere shell
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = radius * (0.8 + Math.random() * 0.2);
            positions[i3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i3 + 2] = r * Math.cos(phi);
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 1.5,
            sizeAttenuation: true
        });

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

    render() {
        if (!this.renderer) return;

        // Slow sun rotation
        if (this.sun) {
            this.sun.rotation.y += 0.001;
        }

        // Animate planets: orbit around sun + self rotation
        for (const [, planet] of this.planets) {
            planet.pivot.rotation.y += planet.orbitalSpeed;
            planet.mesh.rotation.y += planet.rotationSpeed;
        }

        this.renderer.render(this.scene, this.camera);
    }

    dispose() {
        window.removeEventListener('resize', this._boundResize);
        this.renderer?.dispose();
    }
}
