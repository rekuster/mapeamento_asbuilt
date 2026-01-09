import { useState, useCallback, useRef, useEffect } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { IFCLoader } from "web-ifc-three";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export function useIfcViewer() {
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const ifcLoaderRef = useRef<IFCLoader | null>(null);

    const [isLoaded, setIsLoaded] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState<any>(null);
    const [xRay, setXRay] = useState(false);
    const xRayRef = useRef(xRay);

    useEffect(() => {
        xRayRef.current = xRay;
    }, [xRay]);

    const [mappingMode, setMappingMode] = useState(false);
    const mappingModeRef = useRef(mappingMode);
    const currentModelID = useRef<number | null>(null);

    useEffect(() => {
        mappingModeRef.current = mappingMode;
    }, [mappingMode]);

    // Fetch colors from backend
    const { data: roomColors } = trpc.ifc.getRoomsWithColors.useQuery();

    const init = useCallback((container: HTMLDivElement) => {
        // 1. Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0f172a); // slate-900
        sceneRef.current = scene;

        // 2. Camera
        const camera = new THREE.PerspectiveCamera(
            45,
            container.clientWidth / container.clientHeight,
            0.1,
            2000
        );
        camera.position.set(50, 50, 50);
        cameraRef.current = camera;

        // 3. Renderer
        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            logarithmicDepthBuffer: true // Fixes Z-fighting/trembling for large models
        });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // 4. Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controlsRef.current = controls;

        // 5. Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 100, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.set(2048, 2048);
        scene.add(directionalLight);

        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x080820, 0.8);
        scene.add(hemiLight);

        // 6. IFC Loader
        const loader = new IFCLoader();
        loader.ifcManager.setWasmPath("/");

        // CRITICAL: Disable geometry merging to preserve individual elements
        // This ensures IfcSlab, IfcSpace, IfcWall, etc. are loaded separately
        loader.ifcManager.applyWebIfcConfig({
            COORDINATE_TO_ORIGIN: true,
            USE_FAST_BOOLS: false  // Disable to prevent geometry merging
        });

        // Configure to load ALL element types individually
        console.log("🏗️ IFC Loader configured to load elements INDIVIDUALLY (no merging)");

        ifcLoaderRef.current = loader;

        // 7. Animation Loop
        const animate = () => {
            const frameId = requestAnimationFrame(animate);
            if (controlsRef.current) controlsRef.current.update();
            renderer.render(scene, camera);
        };
        const animationId = requestAnimationFrame(animate);

        setIsLoaded(true);

        return () => {
            cancelAnimationFrame(animationId);
            renderer.dispose();
            if (container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement);
            }
        };
    }, []);

    const applyColors = useCallback(async (model: any) => {
        if (!roomColors || !ifcLoaderRef.current || !sceneRef.current) return;

        const manager = ifcLoaderRef.current.ifcManager;

        for (const item of roomColors) {
            const room = item as any;
            if (room.ifcExpressId) {
                try {
                    // Create a material for the color
                    const color = new THREE.Color(room.color);
                    manager.createSubset({
                        modelID: model.modelID,
                        ids: [room.ifcExpressId],
                        material: new THREE.MeshPhongMaterial({
                            color: color,
                            transparent: true,
                            opacity: 0.7, // Slightly higher opacity for better visibility
                            side: THREE.DoubleSide,
                            depthTest: true,
                            depthWrite: true
                        }),
                        scene: sceneRef.current,
                        removePrevious: false
                    });
                } catch (e) {
                    console.warn(`Could not apply color to room ${room.nome}:`, e);
                }
            }
        }
        console.log("Colors applied to IFC model rooms");
    }, [roomColors]);

    useEffect(() => {
        if (!sceneRef.current) return;
        sceneRef.current.traverse((child: any) => {
            if (child.isMesh && !child.name.includes("Subset") && child.userData?.type !== "subset") {
                // Determine if it's an IfcSpace (Ghost Volume)
                const isSpace = child.userData?.ifcType === 'IFCSPACE' || child.name?.includes('IfcSpace');

                if (isSpace) {
                    // Spaces are semi-transparent and clickable in mapping mode
                    child.material.transparent = true;
                    child.material.opacity = mappingMode ? 0.3 : 0.05; // Faint if not mapping
                    child.material.visible = mappingMode || xRay; // Hidden unless xRay or Mapping
                    child.material.depthWrite = false; // Prevent spaces from occluding other objects
                } else {
                    if (xRay) {
                        child.material.transparent = true;
                        child.material.opacity = 0.2;
                    } else {
                        child.material.transparent = false;
                        child.material.opacity = 1.0;
                    }
                }
            }
        });
    }, [xRay, mappingMode]);

    // Clear selection highlight manually from the scene (more reliable)
    const clearSelectionHighlight = useCallback(() => {
        if (!sceneRef.current) return;

        console.log("🧹 Clearing all selection highlights");
        const toRemove: THREE.Object3D[] = [];
        sceneRef.current.traverse((child: any) => {
            if (child.isMesh && (child.name === 'selection-highlight' || child.userData?.customID === 'selection-highlight')) {
                toRemove.push(child);
            }
        });

        toRemove.forEach(obj => {
            sceneRef.current?.remove(obj);
            if ((obj as any).geometry) (obj as any).geometry.dispose();
            if ((obj as any).material) {
                if (Array.isArray((obj as any).material)) {
                    (obj as any).material.forEach((m: any) => m.dispose());
                } else {
                    (obj as any).material.dispose();
                }
            }
        });

        setSelectedRoom(null);
    }, []);

    // Keydown listener for Esc key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                console.log("⌨️ Esc pressed - clearing selection");
                clearSelectionHighlight();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [clearSelectionHighlight]);

    const handleSelection = useCallback(async (event: MouseEvent) => {
        if (!rendererRef.current || !cameraRef.current || !sceneRef.current || !ifcLoaderRef.current) return;

        const rect = rendererRef.current.domElement.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        console.log("🎯 Raycasting at normalized coords:", { x, y });

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

        // Intersect recursive to find subsets and original mesh
        const intersects = raycaster.intersectObjects(sceneRef.current.children, true);

        console.log("🔍 Intersections found:", intersects.length);

        if (intersects.length > 0) {
            const intersect = intersects[0];
            const object = intersect.object as any;
            const index = intersect.faceIndex;

            // Avoid re-selecting the highlight mesh itself
            if (object.name === 'selection-highlight' || object.userData?.customID === 'selection-highlight') {
                console.log("⚠️ Clicked on the highlight mesh, clearing selection");
                clearSelectionHighlight();
                return;
            }

            console.log("📦 Intersected object:", {
                name: object.name,
                type: object.type,
                modelID: object.modelID,
                faceIndex: index,
                hasGeometry: !!object.geometry,
                userData: object.userData
            });

            if (index !== undefined && index !== null) {
                try {
                    const id = await ifcLoaderRef.current.ifcManager.getExpressId(
                        object.geometry,
                        index
                    );

                    console.log("✅ Picked ID:", id);

                    // --- HIGHLIGHT LOGIC (BLUE) ---
                    const modelID = object.modelID !== undefined ? object.modelID : (currentModelID.current || 0);
                    const manager = ifcLoaderRef.current.ifcManager;

                    // 1. Manually remove previous highlights first
                    clearSelectionHighlight();

                    // 2. Create new highlight subset
                    const subset = manager.createSubset({
                        modelID: modelID,
                        ids: [id],
                        material: new THREE.MeshPhongMaterial({
                            color: 0x3b82f6, // Blue
                            transparent: true,
                            opacity: 0.5,
                            side: THREE.DoubleSide,
                            depthTest: false // Ensure highlight is visible
                        }),
                        scene: sceneRef.current,
                        removePrevious: true,
                        customID: 'selection-highlight'
                    });

                    // Tag the subset mesh to find it later
                    if (subset) {
                        subset.name = 'selection-highlight';
                        subset.userData.customID = 'selection-highlight';
                    }
                    // ------------------------------

                    // In mapping mode, show the ID in the panel
                    if (mappingModeRef.current) {
                        setSelectedRoom({ ifcExpressId: id, nome: `Object ${id}` } as any);
                        toast.info(`Objeto selecionado: ID ${id}`);
                        return;
                    }

                    // Find room metadata by express ID
                    const room = (roomColors as any[])?.find(r => r.ifcExpressId === id);
                    if (room) {
                        setSelectedRoom(room);
                        toast.info(`Sala Selecionada: ${room.nome}`);
                    } else {
                        // Properties check for debugging
                        const props = await ifcLoaderRef.current.ifcManager.getItemProperties(modelID, id);
                        console.log("📋 Object details (not a mapped room):", props);

                        // Show object info even if not mapped
                        setSelectedRoom({
                            ifcExpressId: id,
                            nome: props?.Name?.value || `Object ${id}`,
                            type: props?.type || 'Unknown'
                        } as any);
                    }
                } catch (e) {
                    console.error("❌ Pick error:", e);
                }
            } else {
                console.log("⚠️ No faceIndex found on intersected object");
                clearSelectionHighlight();
            }
        } else {
            console.log("❌ No intersections found - clearing selection");
            clearSelectionHighlight();
        }
    }, [roomColors, mappingModeRef, clearSelectionHighlight]);


    // Track mouse position to distinguish clicks from drags
    const mouseDownPos = useRef<{ x: number; y: number } | null>(null);

    useEffect(() => {
        const canvas = rendererRef.current?.domElement;
        if (!canvas) {
            console.log("❌ Canvas not found for event listeners");
            return;
        }

        console.log("✅ Attaching click event listeners to canvas");

        const onMouseDown = (e: MouseEvent) => {
            mouseDownPos.current = { x: e.clientX, y: e.clientY };
            console.log("🖱️ Mouse down at:", e.clientX, e.clientY);
        };

        const onMouseUp = (e: MouseEvent) => {
            if (!mouseDownPos.current) return;

            // Calculate distance moved
            const dx = e.clientX - mouseDownPos.current.x;
            const dy = e.clientY - mouseDownPos.current.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            console.log("🖱️ Mouse up - Distance moved:", distance);

            // If mouse moved less than 5 pixels, treat as click (not drag)
            if (distance < 5) {
                console.log("✅ Click detected! Calling handleSelection");
                handleSelection(e);
            } else {
                console.log("↔️ Drag detected (distance > 5px), ignoring selection");
            }

            mouseDownPos.current = null;
        };

        canvas.addEventListener('mousedown', onMouseDown);
        canvas.addEventListener('mouseup', onMouseUp);

        return () => {
            console.log("🔄 Removing click event listeners");
            canvas.removeEventListener('mousedown', onMouseDown);
            canvas.removeEventListener('mouseup', onMouseUp);
        };
    }, [handleSelection]);

    const loadIfcModel = useCallback(async (url: string) => {
        if (!ifcLoaderRef.current || !sceneRef.current || !cameraRef.current || !controlsRef.current) return;

        try {
            console.log("Loading IFC from:", url);
            // Clear previous models
            sceneRef.current.children = sceneRef.current.children.filter(
                c => c instanceof THREE.Light
            );

            // Load the IFC file
            const model = (await ifcLoaderRef.current.loadAsync(url)) as any;
            const modelID = model.modelID;
            currentModelID.current = modelID;

            console.log("📦 Model loaded with ID:", modelID);
            console.log("Total children in model:", model.children?.length || 0);

            // Get all IFC element IDs by type
            const manager = ifcLoaderRef.current.ifcManager;

            // Common IFC types to load
            const typesToLoad = [
                'IFCWALLSTANDARDCASE',
                'IFCWALL',
                'IFCSLAB',
                'IFCSPACE',
                'IFCDOOR',
                'IFCWINDOW',
                'IFCCOLUMN',
                'IFCBEAM',
                'IFCPLATE',
                'IFCMEMBER',
                'IFCROOF',
                'IFCSTAIR',
                'IFCRAILING',
                'IFCFURNISHINGELEMENT'
            ];

            console.log("🔍 Loading elements by type...");
            let totalElements = 0;
            const loadedTypes: string[] = [];

            for (const typeName of typesToLoad) {
                try {
                    // Get all elements of this type
                    const ids = await manager.getAllItemsOfType(modelID, typeName as any, false);

                    if (ids && ids.length > 0) {
                        console.log(`  ✅ ${typeName}: ${ids.length} elements`);
                        totalElements += ids.length;
                        loadedTypes.push(`${typeName} (${ids.length})`);

                        // Create a subset for this type (this makes them visible)
                        const subset = await manager.createSubset({
                            modelID,
                            ids: Array.isArray(ids) ? ids : Array.from(ids),
                            scene: sceneRef.current,
                            removePrevious: false,
                            customID: typeName
                        });

                        if (subset) {
                            subset.castShadow = true;
                            subset.receiveShadow = true;
                        }
                    }
                } catch (e) {
                    // Type not found in model, skip silently
                }
            }

            console.log("📊 Loading Summary:");
            console.log("  - Total elements loaded:", totalElements);
            console.log("  - Types found:", loadedTypes);

            // Track element types from the original model too
            const elementTypes = new Set<string>();
            let meshCount = 0;
            let slabCount = 0;
            let spaceCount = 0;

            // Premium settings
            model.traverse((child: any) => {
                if (child.isMesh) {
                    meshCount++;
                    child.castShadow = true;
                    child.receiveShadow = true;

                    // Track element types
                    if (child.name) {
                        const typeName = child.name.split(':')[0] || child.name;
                        elementTypes.add(typeName);

                        if (child.name.includes('IfcSlab') || child.name.includes('Slab')) {
                            slabCount++;
                            console.log("🟦 Found IfcSlab:", child.name, "visible:", child.visible);
                        }
                        if (child.name.includes('IfcSpace') || child.name.includes('Space')) {
                            spaceCount++;
                        }
                    }

                    // Identify IfcSpace during load
                    if (child.name?.includes('IfcSpace')) {
                        child.userData.ifcType = 'IFCSPACE';
                    }

                    if (xRayRef.current) {
                        child.material.transparent = true;
                        child.material.opacity = 0.2;
                    }
                }
            });

            console.log("📊 Original Model Statistics:");
            console.log("  - Total meshes:", meshCount);
            console.log("  - IfcSlab count:", slabCount);
            console.log("  - IfcSpace count:", spaceCount);
            console.log("  - Element types found:", Array.from(elementTypes).sort());

            console.log("IFC Model loaded successfully:", model);
            sceneRef.current.add(model);

            // Fit to view
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());

            // Calculate distance based on box size and camera FOV
            const maxDim = Math.max(size.x, size.y, size.z);
            const fov = cameraRef.current.fov * (Math.PI / 180);
            let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
            cameraZ *= 2.5; // Add some padding

            // Set camera position and target
            cameraRef.current.position.set(center.x + cameraZ, center.y + cameraZ, center.z + cameraZ);
            cameraRef.current.lookAt(center);

            controlsRef.current.target.copy(center);
            controlsRef.current.update();

            // Apply status colors
            await applyColors(model);

            toast.success("Modelo IFC carregado com sucesso!");
        } catch (error: any) {
            console.error("Detailed IFC loading error:", error);
            if (error.message?.includes('magic word') || error.message?.includes('WASM')) {
                toast.error("Erro crítico: O navegador recebeu HTML em vez do arquivo 3D (WASM). Tente limpar o cache do navegador.");
            } else {
                toast.error(`Erro ao carregar modelo: ${error.message || 'Erro desconhecido'}`);
            }
        }
    }, [applyColors]);

    return {
        containerRef,
        init,
        loadIfcModel,
        isLoaded,
        selectedRoom,
        setSelectedRoom, // Export to allow UI to clear selection
        applyColors,
        xRay,
        setXRay,
        mappingMode,
        setMappingMode
    };
}
