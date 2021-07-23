/**
 * @author alteredq / http://alteredqualia.com/
 *
 * Convolution shader
 * ported from o3d sample to WebGL / GLSL
 * http://o3d.googlecode.com/svn/trunk/samples/convolution.html
 */

//Convolution
THREE.ConvolutionShader = {

    defines: {

        "KERNEL_SIZE_FLOAT": "25.0",
        "KERNEL_SIZE_INT": "25"

    },

    uniforms: {

        "tDiffuse": { value: null },
        "uImageIncrement": { value: new THREE.Vector2(0.001953125, 0.0) },
        "cKernel": { value: [] }

    },

    vertexShader: [

        "uniform vec2 uImageIncrement;",

        "varying vec2 vUv;",

        "void main() {",
        "vUv = uv - ( ( KERNEL_SIZE_FLOAT - 1.0 ) / 2.0 ) * uImageIncrement;",
        "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

        "}"

    ].join("\n"),

    fragmentShader: [

        "uniform float cKernel[ KERNEL_SIZE_INT ];",

        "uniform sampler2D tDiffuse;",
        "uniform vec2 uImageIncrement;",

        "varying vec2 vUv;",

        "void main() {",

        "vec2 imageCoord = vUv;",
        "vec4 sum = vec4( 0.0, 0.0, 0.0, 0.0 );",
        "for( int i = 0; i < KERNEL_SIZE_INT; i ++ ) {",
        "vec4 tex = texture2D( tDiffuse, imageCoord );",
        "float xx = 1.0; ",
        "#if defined( USE_COLOR_WEIGTH )",
        "if((tex.r + tex.g + tex.b) / 3.0 > 0.0) xx = 2.5; else xx = 0.4;",
        "#endif",
        "sum += texture2D( tDiffuse, imageCoord ) * cKernel[ i ] * xx;",
        "imageCoord += uImageIncrement;",

        "}",

        "gl_FragColor = sum;",

        "}"


    ].join("\n"),

    buildKernel: function (sigma) {

        // We lop off the sqrt(2 * pi) * sigma term, since we're going to normalize anyway.

        function gauss(x, sigma) {

            return Math.exp(- (x * x) / (2.0 * sigma * sigma));

        }

        var i, values, sum, halfWidth, kMaxKernelSize = 25, kernelSize = 2 * Math.ceil(sigma * 3.0) + 1;

        if (kernelSize > kMaxKernelSize) kernelSize = kMaxKernelSize;
        halfWidth = (kernelSize - 1) * 0.5;

        //Create an array
        values = new Array(kernelSize);
        sum = 0.0;
        for (i = 0; i < kernelSize; ++i) {

            values[i] = gauss(i - halfWidth, sigma);
            sum += values[i];

        }

        // normalize the kernel
        for (i = 0; i < kernelSize; ++i) values[i] /= sum;

        return values;

    }

}

/**
 * @author alteredq / http://alteredqualia.com/
 *
 * Film grain & scanlines shader
 *
 * - ported from HLSL to WebGL / GLSL
 * http://www.truevision3d.com/forums/showcase/staticnoise_colorblackwhite_scanline_shaders-t18698.0.html
 *
 * Screen Space Static Postprocessor
 *
 * Produces an analogue noise overlay similar to a film grain / TV static
 *
 * Original implementation and noise algorithm
 * Pat 'Hawthorne' Shearon
 *
 * Optimized scanlines + noise version with intensity scaling
 * Georg 'Leviathan' Steinrohder
 *
 * This version is provided under a Creative Commons Attribution 3.0 License
 * http://creativecommons.org/licenses/by/3.0/
 */

THREE.FilmShader = {

    uniforms: {

        "tDiffuse": { type: "t", value: null },
        "time": { type: "f", value: 0.0 },
        "nIntensity": { type: "f", value: 0.5 },
        "sIntensity": { type: "f", value: 0.05 },
        "sCount": { type: "f", value: 4096 },
        "grayscale": { type: "i", value: 1 }

    },

    vertexShader: [

        "varying vec2 vUv;",

        "void main() {",

        "vUv = uv;",
        "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

        "}"

    ].join("\n"),

    fragmentShader: [

        // control parameter
        "uniform float time;",

        "uniform bool grayscale;",

        // noise effect intensity value (0 = no effect, 1 = full effect)
        "uniform float nIntensity;",

        // scanlines effect intensity value (0 = no effect, 1 = full effect)
        "uniform float sIntensity;",

        // scanlines effect count value (0 = no effect, 4096 = full effect)
        "uniform float sCount;",

        "uniform sampler2D tDiffuse;",

        "varying vec2 vUv;",

        "void main() {",

        // sample the source
        "vec4 cTextureScreen = texture2D( tDiffuse, vUv );",

        // make some noise
        "float x = vUv.x * vUv.y * time *  1000.0;",
        "x = mod( x, 13.0 ) * mod( x, 123.0 );",
        "float dx = mod( x, 0.01 );",

        // add noise
        "vec3 cResult = cTextureScreen.rgb + cTextureScreen.rgb * clamp( 0.1 + dx * 100.0, 0.0, 1.0 );",

        // get us a sine and cosine
        "vec2 sc = vec2( sin( vUv.y * sCount ), cos( vUv.y * sCount ) );",

        // add scanlines
        "cResult += cTextureScreen.rgb * vec3( sc.x, sc.y, sc.x ) * sIntensity;",

        // interpolate between source and result by intensity
        "cResult = cTextureScreen.rgb + clamp( nIntensity, 0.0,1.0 ) * ( cResult - cTextureScreen.rgb );",

        // convert to grayscale if desired
        "if( grayscale ) {",

        "cResult = vec3( cResult.r * 0.3 + cResult.g * 0.59 + cResult.b * 0.11 );",

        "}",

        "gl_FragColor =  vec4( cResult, cTextureScreen.a );",

        "}"

    ].join("\n")

};


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