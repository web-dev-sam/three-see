

class See {

    constructor() {
        this.init();
    }


    async init() {
        this.scene = new THREE.Scene();
        this.clock = new THREE.Clock();
        this.camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 40);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.see = await this.fetchSee('models/see.gltf');
        this.time = 0;
        this.frame = 0;

        // Add scene to DOM
        this.show();

        // Add model to the scene
        this.seeModel = this.see.scene.children[0];
        this.scene.add(this.seeModel);

        // Set camera position
        // Setup lighting
        // Replace some materials like the floor and octopus
        // Add fog
        // Add postprocessing (bloom)
        this.setupCamera();
        this.setupLighting();
        this.addCustomizations();
        this.addFog();
        this.postprocessing();

        // Render the scene
        this.render();
    }


    /*
    * Runs before the first frame is rendered
    */
    firstFrameSetup() {
        this.octoOffset = this.octopus.position.y;
        this.cameraOffset = this.camera.rotation.x;
    }


    /*
    * Render a frame
    */
    render() {

        if (this.frame === 0) {
            this.firstFrameSetup();
            this.frame++;
        }

        // Move camera
        this.camera.rotation.x = this.cameraOffset + Math.sin(this.time / 1.5) * 0.02;
        this.octopus.position.y = this.octoOffset + Math.sin(this.time / 2) / 6;

        // Clear the scene and render it
        this.renderer.autoClear = false;
        this.renderer.clear();
        const dT = this.clock.getDelta();
        this.composer.render(dT);

        // Keep track of time
        this.time += dT;
        this.frame++;

        // Render again
        requestAnimationFrame(() => this.render());
    }


    /*
    * Setup postprossessing
    */
    postprocessing() {

        // Setup shader passes and composer
        const renderPass = new THREE.RenderPass(this.scene, this.camera);
        const effectCopy = new THREE.ShaderPass(THREE.CopyShader);
        const bloomPass = new THREE.BloomPass(1.7, 15, 5.0, 32);
        this.composer = new THREE.EffectComposer(this.renderer);
        effectCopy.renderToScreen = true;

        // Add bloom effect
        this.composer.addPass(renderPass);
        this.composer.addPass(bloomPass);
        this.composer.addPass(effectCopy);
    }


    /*
    * Adds fog to the scene
    */
    addFog() {

        // Adding fog
        const fogColor = new THREE.Color(0x160c84);
        this.scene.background = fogColor;
        this.scene.fog = new THREE.Fog(fogColor, -2, 19);
    }


    /*
    * Replaces some materials like the floor and octopus
    */
    addCustomizations() {
        const me = this;

        let i = 0;
        this.seeModel.traverse(n => {
            if (n.isMesh) {

                // Enable shadows
                n.castShadow = true;
                n.receiveShadow = true;

                // Floor
                if (i == 0) {
                    me.floor = n;
                    me.replaceFloor();
                }

                // Octupus
                if (i == 527) {
                    me.octopus = n;
                    me.makeOctopusGlow();
                }

                // Hide sky box
                if (i++ == 1) {
                    n.visible = false;
                    return;
                }

                // Add anisotropy
                if (n.material.map)
                    n.material.map.anisotropy = 16;
            }
        });
    }


    /*
    * Make floor sandy
    */
    replaceFloor() {
        this.floor.material = new THREE.MeshPhongMaterial({
            color: 0xC2B280,
            specular: 0x050505,
            shininess: 100
        });
    }


    /*
    * Make octopus glowy
    */
    makeOctopusGlow() {
        this.octopus.material = new THREE.MeshLambertMaterial({
            color: 0xFF0000,
            emissive: 0xFF0000,
            emissiveIntensity: 8
        });
    }


    /*
    * Setup lighting
    */
    setupLighting() {

        // Add hemisphere light
        this.hemisphereLight = new THREE.HemisphereLight(0xb1eeff, 0x080820, 4);
        this.hemisphereLight.intensity = 0.1;
        this.scene.add(this.hemisphereLight);

        // Add backgroud spot light
        this.spotLight = new THREE.SpotLight(0xFF0000, 1);
        this.spotLight.position.set(7, 7, -20);
        this.spotLight.intensity = 0.6;
        this.spotLight.castShadow = true;
        this.spotLight.shadow.bias = -0.0001;
        this.spotLight.shadow.mapSize.width = 1024 * 8;
        this.spotLight.shadow.mapSize.height = 1024 * 8;
        this.scene.add(this.spotLight);

        this.renderer.shadowMap.enabled = true;
    }


    /*
    * Setup the camera
    */
    setupCamera() {
        this.camera.position.z = 6.6;
        this.camera.position.x = 11;
        this.camera.position.y = 3;
        this.camera.rotation.x = -1 / 8;
        this.camera.rotation.y = 0.7;
    }


    /*
    * Adds scene to the DOM
    */
    show() {
        this.renderer.setSize(window.innerWidth, window.innerHeight)
        document.body.appendChild(this.renderer.domElement)
    }


    fetchSee(path) {
        return new Promise(function (resolve, reject) {

            // Instantiate a loader
            const loader = new THREE.GLTFLoader();

            // Load a glTF resource
            loader.load(
                path,
                resolve,
                function (xhr) {
                    console.log((xhr.loaded / xhr.total * 100) + '% loaded');
                },
                function (error) {
                    reject(error);
                }
            );
        });
    }

}


new See();