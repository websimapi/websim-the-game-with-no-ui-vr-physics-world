import * as THREE from 'three';

export class CraftingManager {
    constructor(game) {
        this.game = game;
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        document.getElementById('craft-button').addEventListener('click', () => {
            this.craftItem();
        });
        
        document.getElementById('cancel-button').addEventListener('click', () => {
            this.hideModal();
        });
    }
    
    showModal() {
        document.getElementById('crafting-modal').style.display = 'block';
        document.getElementById('crafting-input').focus();
    }
    
    hideModal() {
        document.getElementById('crafting-modal').style.display = 'none';
        document.getElementById('crafting-input').value = '';
    }
    
    async craftItem() {
        const description = document.getElementById('crafting-input').value.trim();
        if (!description) return;
        
        this.hideModal();
        
        try {
            // Generate item design using AI
            const completion = await websim.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: `You are a 3D item generator for a VR physics game. Create detailed specifications for a 3D object based on the user's description.
                        
Respond with JSON only:
{
  "name": "item name",
  "type": "basic_shape|complex", 
  "geometry": "box|sphere|cylinder|custom",
  "size": {"width": 1, "height": 1, "depth": 1},
  "color": "#hexcolor",
  "weight": 1.0,
  "special_properties": ["glowing", "magnetic", "sharp", "bouncy"],
  "description": "detailed description"
}`
                    },
                    {
                        role: "user",
                        content: description
                    }
                ],
                json: true
            });
            
            const itemSpec = JSON.parse(completion.content);
            this.createCraftedItem(itemSpec);
            
        } catch (error) {
            console.error('Failed to craft item:', error);
        }
    }
    
    createCraftedItem(spec) {
        let mesh;
        const position = new THREE.Vector3(
            (Math.random() - 0.5) * 4,
            3,
            (Math.random() - 0.5) * 4
        );
        
        // Create geometry based on spec
        switch (spec.geometry) {
            case 'sphere':
                mesh = this.game.createSphere(position, spec.color, spec.size.width * 0.5);
                break;
            case 'cylinder':
                const cylinderGeometry = new THREE.CylinderGeometry(
                    spec.size.width * 0.5, 
                    spec.size.width * 0.5, 
                    spec.size.height, 
                    8
                );
                const cylinderMaterial = new THREE.MeshLambertMaterial({ color: spec.color });
                mesh = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
                mesh.position.copy(position);
                this.game.scene.add(mesh);
                break;
            default:
                mesh = this.game.createCube(position, spec.color, spec.size.width);
                break;
        }
        
        // Apply special properties
        if (spec.special_properties.includes('glowing')) {
            mesh.material.emissive = new THREE.Color(spec.color);
            mesh.material.emissiveIntensity = 0.2;
        }
        
        mesh.userData.crafted = true;
        mesh.userData.spec = spec;
        mesh.userData.id = 'crafted_' + Date.now();
        
        // Save to world state
        this.game.room.updateRoomState({
            crafted_items: {
                [mesh.userData.id]: {
                    spec: spec,
                    position: position.toArray(),
                    created_by: this.game.room.clientId
                }
            }
        });
    }
    
    createAnvil(position) {
        const group = new THREE.Group();
        
        // Base
        const baseGeometry = new THREE.BoxGeometry(2, 0.5, 1);
        const baseMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = 0.25;
        group.add(base);
        
        // Top
        const topGeometry = new THREE.BoxGeometry(1.5, 0.3, 0.8);
        const top = new THREE.Mesh(topGeometry, baseMaterial);
        top.position.y = 0.65;
        group.add(top);
        
        group.position.copy(position);
        group.userData = { isAnvil: true, grabbable: false };
        this.game.scene.add(group);
        
        return group;
    }
}