import * as THREE from 'three';
import { PhysicsManager } from './physics.js';
import { VRManager } from './vr.js';
import { CraftingManager } from './crafting.js';
import { MultiplayerManager } from './multiplayer.js';

// Make THREE available globally for compatibility
window.THREE = THREE;

export class VRPhysicsGame {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        
        this.physics = new PhysicsManager();
        this.vr = new VRManager(this);
        this.crafting = new CraftingManager(this);
        this.multiplayer = new MultiplayerManager(this);
        
        this.worldObjects = new Map();
        
        this.init();
    }
    
    async init() {
        await this.multiplayer.setup();
        this.physics.setup();
        this.setupRenderer();
        this.setupScene();
        this.vr.setup();
        this.setupControls();
        this.loadWorldState();
        this.animate();
    }
    
    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.xr.enabled = true;
        document.body.appendChild(this.renderer.domElement);
    }
    
    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x505050);
        
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 1.6, 3);
        
        // Lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
        
        // Ground
        this.physics.createGround(this.scene);
        
        // Sample objects
        this.createSampleObjects();
    }
    
    createSampleObjects() {
        this.physics.createCube(this.scene, new THREE.Vector3(2, 2, 0), 0xff0000, 1);
        this.physics.createSphere(this.scene, new THREE.Vector3(-2, 2, 0), 0x00ff00, 0.5);
        this.physics.createCube(this.scene, new THREE.Vector3(0, 2, -2), 0x0000ff, 0.8);
        
        this.crafting.createAnvil(this.scene, new THREE.Vector3(0, 1, -5));
    }
    
    setupControls() {
        // Remove crafting modal key binding - VR only interactions
        // VR crafting will be handled through anvil interaction
    }
    
    loadWorldState() {
        // Load persistent world data from database
    }
    
    animate() {
        this.renderer.setAnimationLoop(() => {
            this.physics.update();
            this.multiplayer.updatePresence(this.renderer, this.camera);
            this.renderer.render(this.scene, this.camera);
        });
    }
}

// Initialize the game
const game = new VRPhysicsGame();

// Handle window resize
window.addEventListener('resize', () => {
    if (game.camera && game.renderer) {
        game.camera.aspect = window.innerWidth / window.innerHeight;
        game.camera.updateProjectionMatrix();
        game.renderer.setSize(window.innerWidth, window.innerHeight);
    }
});