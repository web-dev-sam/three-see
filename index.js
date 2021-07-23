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


function loadSee() {
    return new Promise(function (resolve, reject) {

        // Instantiate a loader
        const loader = new THREE.GLTFLoader();

        // Load a glTF resource
        loader.load(
            'models/see.gltf',
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



(async function () {


    // Init the scene
    const scene = new THREE.Scene()
    const clock = new THREE.Clock();
    const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 50)
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)

    // Add scene to DOM
    document.body.appendChild(renderer.domElement)

    // Load the glTF model and add it to the scene
    const see = await loadSee();
    const model = see.scene.children[0];
    scene.add(model);

    // Set camera position
    camera.position.z = 6.6
    camera.position.x = 11
    camera.position.y = 3
    camera.rotation.x = -1 / 8
    camera.rotation.y = 0.7

    // Add hemisphere light
    const hemiLight = new THREE.HemisphereLight(0xb1eeff, 0x080820, 4);
    hemiLight.intensity = 0.1;
    scene.add(hemiLight);

    // Add spot light
    const light = new THREE.SpotLight(0xFF0000, 1);
    light.position.set(7, 7, -20);
    light.intensity = 0.6;
    light.castShadow = true;
    light.shadow.bias = -0.0001;
    light.shadow.mapSize.width = 1024 * 8;
    light.shadow.mapSize.height = 1024 * 8;
    scene.add(light);

    // Setup lighting effects
    let octopus;
    let i = 0;
    model.traverse(n => {
        if (n.isMesh) {

            // Enable shadows
            n.castShadow = true;
            n.receiveShadow = true;

            if (i == 0) {
                /*const glow = new THREE.PointLight(0xff5c5c, 1, 100);
                glow.position.set(7.75, 6.5, -10.8);
                glow.intensity = 0.7;
                glow.castShadow = true;
                glow.shadow.bias = -0.0001;
                glow.shadow.mapSize.width = 1024 * 8;
                glow.shadow.mapSize.height = 1024 * 8;
                scene.add(glow);*/
                //const pointLightHelper = new THREE.PointLightHelper(glow, 1);
                //scene.add(pointLightHelper);
                n.material = new THREE.MeshPhongMaterial({
                    color: 0xC2B280,
                    specular: 0x050505,
                    shininess: 100
                });
            }

            // Octupus glow
            if (i == 527) {
                octopus = n;
                octopus.material = new THREE.MeshLambertMaterial({
                    color: 0xFF0000,
                    emissive: 0xFF0000,
                    emissiveIntensity: 8
                });
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
    renderer.shadowMap.enabled = true;

    // Adding fog
    const fogColor = new THREE.Color(0x160c84);
    scene.background = fogColor;
    scene.fog = new THREE.Fog(fogColor, -2, 19);

    // Add bloom effect
    var renderPass = new THREE.RenderPass(scene, camera);
    var effectCopy = new THREE.ShaderPass(THREE.CopyShader);
    effectCopy.renderToScreen = true;

    var bloomPass = new THREE.BloomPass(1.7, 15, 5.0, 32);
    var composer = new THREE.EffectComposer(renderer);
    composer.addPass(renderPass);
    composer.addPass(bloomPass);
    composer.addPass(effectCopy);
    /*
        const bloom = new THREE.BloomPass(1, 1);
        bloom.renderToScreen = true;
        const composer = new THREE.EffectComposer(renderer);
        composer.addPass(bloom);
        composer.addPass(new THREE.RenderPass(scene, camera));
        composer.addPass(new THREE.ShaderPass(THREE.CopyShader));
        renderer.autoClear = false;
        renderer.setClearColor(0x000000, 0);*/




    // Scene Animation
    const octoOffset = octopus.position.y;
    const cameraOffset = camera.rotation.x;
    let time = 0;
    const animate = function () {

        // Move camera
        camera.rotation.x = cameraOffset + Math.sin(time / 1.5) * 0.02;
        octopus.position.y = octoOffset + Math.sin(time / 2) / 6;

        // Render the scene
        //renderer.render(scene, camera);
        renderer.autoClear = false;
        renderer.clear();
        const dT = clock.getDelta();
        composer.render(dT);
        time += dT;

        requestAnimationFrame(animate);
    }

    animate();

})();









