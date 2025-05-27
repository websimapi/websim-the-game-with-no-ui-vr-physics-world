import * as THREE from 'three';
import * as CANNON from 'cannon';

// Make CANNON available globally for compatibility
window.CANNON = CANNON;

export class PhysicsManager {
    constructor() {
        this.world = null;
    }
    
    setup() {
        this.world = new CANNON.World();
        this.world.gravity.set(0, -9.82, 0);
        this.world.broadphase = new CANNON.NaiveBroadphase();
        this.world.solver.iterations = 10;
    }
    
    createGround(scene) {
        const groundGeometry = new THREE.PlaneGeometry(50, 50);
        const groundMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x336633,
            transparent: true,
            opacity: 0.8
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        scene.add(ground);
        
        // Physics ground
        const groundShape = new CANNON.Plane();
        const groundBody = new CANNON.Body({ mass: 0 });
        groundBody.addShape(groundShape);
        groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        this.world.add(groundBody);
    }
    
    createCube(scene, position, color, size = 1) {
        const geometry = new THREE.BoxGeometry(size, size, size);
        const material = new THREE.MeshLambertMaterial({ color });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
        
        // Physics
        const shape = new CANNON.Sphere(size * 0.5);
        const body = new CANNON.Body({ mass: size });
        body.addShape(shape);
        body.position.set(position.x, position.y, position.z);
        this.world.add(body);
        
        mesh.userData = { body, grabbable: true, weight: size };
        return mesh;
    }
    
    createSphere(scene, position, color, radius = 0.5) {
        const geometry = new THREE.SphereGeometry(radius, 16, 12);
        const material = new THREE.MeshLambertMaterial({ color });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
        
        // Physics
        const shape = new CANNON.Sphere(radius);
        const body = new CANNON.Body({ mass: radius * 2 });
        body.addShape(shape);
        body.position.set(position.x, position.y, position.z);
        this.world.add(body);
        
        mesh.userData = { body, grabbable: true, weight: radius * 2 };
        return mesh;
    }
    
    update() {
        this.world.step(1/60);
    }
}