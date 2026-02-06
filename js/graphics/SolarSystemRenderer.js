export class SolarSystemRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.onPlanetClick = null;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
    }
    
    async init() {
        console.log('🌍 Initializing 3D Solar System...');
        this.setupScene();
        this.createSun();
        this.createPlanets();
        console.log('✅ Solar System ready');
    }
    
    setupScene() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 10000);
        this.camera.position.set(0, 50, 100);
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    createSun() {
        const geometry = new THREE.SphereGeometry(10, 32, 32);
        const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const sun = new THREE.Mesh(geometry, material);
        this.scene.add(sun);
    }
    
    createPlanets() {
        // TODO: Create planets
    }
    
    render() {
        this.renderer.render(this.scene, this.camera);
    }
}
