export class MultiplayerManager {
    constructor(game) {
        this.game = game;
        this.room = null;
    }
    
    async setup() {
        this.room = new WebsimSocket();
        await this.room.initialize();
        
        // Subscribe to world state changes
        this.room.subscribeRoomState((roomState) => {
            this.syncWorldState(roomState);
        });
        
        // Subscribe to player presence
        this.room.subscribePresence((presence) => {
            this.updatePlayerCount();
            this.syncPlayers(presence);
        });
        
        // Handle crafting requests
        this.room.subscribePresenceUpdateRequests((request, fromClientId) => {
            if (request.type === 'craft_item') {
                this.handleCraftingRequest(request, fromClientId);
            }
        });
    }
    
    updateGrabState(grabbing, objectId) {
        this.room.updatePresence({
            grabbing: grabbing,
            grabbedObject: objectId
        });
    }
    
    saveObjectState(object) {
        if (object.userData.id) {
            this.room.updateRoomState({
                object_positions: {
                    [object.userData.id]: {
                        position: object.position.toArray(),
                        rotation: object.quaternion.toArray(),
                        updated_by: this.room.clientId
                    }
                }
            });
        }
    }
    
    saveCraftedItem(mesh) {
        this.room.updateRoomState({
            crafted_items: {
                [mesh.userData.id]: {
                    spec: mesh.userData.spec,
                    position: mesh.position.toArray(),
                    created_by: this.room.clientId
                }
            }
        });
    }
    
    syncWorldState(roomState) {
        // Sync crafted items
        if (roomState.crafted_items) {
            for (const [id, itemData] of Object.entries(roomState.crafted_items)) {
                if (!this.game.worldObjects.has(id)) {
                    this.createCraftedItemFromData(id, itemData);
                }
            }
        }
        
        // Sync object positions
        if (roomState.object_positions) {
            for (const [id, posData] of Object.entries(roomState.object_positions)) {
                const obj = this.game.worldObjects.get(id);
                if (obj && posData.updated_by !== this.room.clientId) {
                    obj.position.fromArray(posData.position);
                    if (posData.rotation) {
                        obj.quaternion.fromArray(posData.rotation);
                    }
                }
            }
        }
    }
    
    createCraftedItemFromData(id, itemData) {
        const position = new THREE.Vector3().fromArray(itemData.position);
        let mesh;
        
        switch (itemData.spec.geometry) {
            case 'sphere':
                mesh = this.game.createSphere(position, itemData.spec.color, itemData.spec.size.width * 0.5);
                break;
            default:
                mesh = this.game.createCube(position, itemData.spec.color, itemData.spec.size.width);
                break;
        }
        
        mesh.userData.id = id;
        mesh.userData.spec = itemData.spec;
        this.game.worldObjects.set(id, mesh);
    }
    
    syncPlayers(presence) {
        for (const [clientId, playerData] of Object.entries(presence)) {
            if (clientId !== this.room.clientId) {
                this.updateRemotePlayer(clientId, playerData);
            }
        }
    }
    
    updateRemotePlayer(clientId, playerData) {
        console.log(`Player ${clientId}:`, playerData);
    }
    
    updatePlayerCount() {
        // Remove UI update - no interface in VR game
        console.log(`Players online: ${Object.keys(this.room.peers || {}).length}`);
    }
    
    updatePresence(renderer, camera) {
        if (renderer.xr.isPresenting) {
            const xrCamera = renderer.xr.getCamera();
            this.room.updatePresence({
                head_position: xrCamera.position.toArray(),
                head_rotation: xrCamera.quaternion.toArray(),
                in_vr: true
            });
        }
    }
    
    handleCraftingRequest(request, fromClientId) {
        // Handle multiplayer crafting requests
    }
}