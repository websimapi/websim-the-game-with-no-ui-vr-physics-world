import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';
import * as THREE from 'three';

export class VRManager {
    constructor(game) {
        this.game = game;
        this.controllers = [];
        this.hands = [];
        this.grabbedObjects = new Map();
        this.toolbelt = [];
        this.controllerModelFactory = null;
        this.handModelFactory = null;
    }
    
    setup() {
        // Add VR button
        document.body.appendChild(VRButton.createButton(this.game.renderer));
        
        this.controllerModelFactory = new XRControllerModelFactory();
        this.handModelFactory = new XRHandModelFactory();
        
        // Setup controllers
        for (let i = 0; i < 2; i++) {
            const controller = this.game.renderer.xr.getController(i);
            controller.addEventListener('selectstart', (event) => this.onSelectStart(event, i));
            controller.addEventListener('selectend', (event) => this.onSelectEnd(event, i));
            controller.addEventListener('squeeze', (event) => this.onSqueeze(event, i));
            this.game.scene.add(controller);
            this.controllers[i] = controller;
            
            // Controller model
            const controllerGrip = this.game.renderer.xr.getControllerGrip(i);
            controllerGrip.add(this.controllerModelFactory.createControllerModel(controllerGrip));
            this.game.scene.add(controllerGrip);
            
            // Hand tracking
            const hand = this.game.renderer.xr.getHand(i);
            hand.add(this.handModelFactory.createHandModel(hand, 'mesh'));
            this.game.scene.add(hand);
            this.hands[i] = hand;
        }
        
        this.setupToolbelt();
    }
    
    setupToolbelt() {
        this.toolbeltRadius = 0.8;
        this.toolbeltSlots = 8;
        this.toolbeltItems = [];
        
        for (let i = 0; i < this.toolbeltSlots; i++) {
            const angle = (i / this.toolbeltSlots) * Math.PI * 2;
            const x = Math.cos(angle) * this.toolbeltRadius;
            const z = Math.sin(angle) * this.toolbeltRadius;
            
            // Visual slot indicator
            const slotGeometry = new THREE.RingGeometry(0.08, 0.1, 8);
            const slotMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x444444, 
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.5
            });
            const slot = new THREE.Mesh(slotGeometry, slotMaterial);
            slot.position.set(x, 1.2, z);
            slot.rotation.x = -Math.PI / 2;
            this.game.scene.add(slot);
            
            this.toolbeltItems[i] = { slot, item: null };
        }
    }
    
    onSelectStart(event, controllerIndex) {
        const controller = this.controllers[controllerIndex];
        const intersections = this.getIntersections(controller);
        
        if (intersections.length > 0) {
            const object = intersections[0].object;
            if (object.userData.grabbable) {
                this.grabObject(object, controller, controllerIndex);
            } else if (object.userData.isAnvil) {
                this.game.crafting.showModal();
            }
        }
    }
    
    onSelectEnd(event, controllerIndex) {
        if (this.grabbedObjects.has(controllerIndex)) {
            this.releaseObject(controllerIndex);
        }
    }
    
    onSqueeze(event, controllerIndex) {
        if (this.grabbedObjects.has(controllerIndex)) {
            this.storeInToolbelt(controllerIndex);
        }
    }
    
    grabObject(object, controller, controllerIndex) {
        if (object.userData.body) {
            object.userData.body.type = window.CANNON.Body.KINEMATIC;
        }
        
        const attachment = new THREE.Group();
        controller.add(attachment);
        attachment.attach(object);
        
        this.grabbedObjects.set(controllerIndex, {
            object: object,
            attachment: attachment,
            originalParent: object.parent
        });
        
        this.game.multiplayer.updateGrabState(true, object.userData.id || 'unknown');
    }
    
    releaseObject(controllerIndex) {
        const grabbed = this.grabbedObjects.get(controllerIndex);
        if (!grabbed) return;
        
        const { object, attachment, originalParent } = grabbed;
        
        attachment.remove(object);
        originalParent.add(object);
        
        if (object.userData.body) {
            object.userData.body.type = window.CANNON.Body.DYNAMIC;
            object.userData.body.position.copy(object.position);
            object.userData.body.quaternion.copy(object.quaternion);
        }
        
        this.grabbedObjects.delete(controllerIndex);
        this.game.multiplayer.updateGrabState(false, null);
        this.game.multiplayer.saveObjectState(object);
    }
    
    storeInToolbelt(controllerIndex) {
        const grabbed = this.grabbedObjects.get(controllerIndex);
        if (!grabbed) return;
        
        // Find empty toolbelt slot
        for (let i = 0; i < this.toolbeltSlots; i++) {
            if (!this.toolbeltItems[i].item) {
                const { object } = grabbed;
                
                // Scale down and position in toolbelt
                object.scale.setScalar(0.3);
                object.position.copy(this.toolbeltItems[i].slot.position);
                object.position.y = 1.3;
                
                if (object.userData.body) {
                    object.userData.body.type = window.CANNON.Body.KINEMATIC;
                }
                
                this.toolbeltItems[i].item = object;
                this.releaseObject(controllerIndex);
                break;
            }
        }
    }
    
    getIntersections(controller) {
        const raycaster = new THREE.Raycaster();
        const tempMatrix = new THREE.Matrix4();
        
        tempMatrix.identity().extractRotation(controller.matrixWorld);
        raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
        raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
        
        return raycaster.intersectObjects(this.game.scene.children, true);
    }
}