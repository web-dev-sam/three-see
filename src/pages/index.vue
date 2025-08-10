<script setup lang="ts">
import { useMouse } from '@vueuse/core'
import {
  BackSide,
  Euler,
  Fog,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  SpotLight,
  Vector3,
  WebGLRenderer,
} from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { computed, onMounted, onUnmounted, reactive, shallowRef, useTemplateRef } from 'vue'
import { fogColor, useModel } from '@/utils/gltf'
import { minmaxmap } from '@/utils/util'

let scene: Scene
let renderer: WebGLRenderer
let composer: EffectComposer
let animationId: number

let octoOffset = 0
let cameraOffsetX = -1 / 8

const { meshes, isModelReady } = useModel({
  onSuccess: model => scene.add(model),
})
const canvasContainer = useTemplateRef('canvasContainer')
const { x: mouseX, y: mouseY } = useMouse({ touch: false })

const frame = shallowRef(0)
const time = shallowRef(0)
const camera = shallowRef<PerspectiveCamera | null>()
const windowWidth = shallowRef(window.innerWidth)
const isSceneReady = shallowRef(false)
const cameraPosition = reactive(new Vector3(11, 3, 6.6))
const cameraOffsetY = computed(() => camera.value
  ? minmaxmap(windowWidth.value, 360, 1920, 0.32, 0.7)
  : 0,
)
const relMousePosition = computed(() => {
  return {
    x: mouseX.value / window.innerWidth - 0.5,
    y: mouseY.value / window.innerHeight - 0.5,
  }
})
const cameraRotation = computed(() => {
  if (frame.value === 0)
    return new Euler(cameraOffsetX, cameraOffsetY.value, 0)
  return new Euler(
    cameraOffsetX + Math.sin(time.value / 1.5) * 0.02 - relMousePosition.value.y / 24,
    cameraOffsetY.value - relMousePosition.value.x / 24,
    0,
  )
})

onMounted(async () => {
  init()
  render()
  isSceneReady.value = true
})

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  window.removeEventListener('resize', onWindowResize)
  try {
    composer?.reset()
    renderer?.dispose()
  }
  catch {}
})

function init() {
  scene = new Scene()

  // Fog
  scene.fog = new Fog(fogColor, -4, 17)

  // Camera
  camera.value = new PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000)
  camera.value.position.copy(cameraPosition)
  camera.value.rotation.set(cameraOffsetX, cameraOffsetY.value, 0)

  // Renderer
  renderer = new WebGLRenderer({ antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = PCFSoftShadowMap
  canvasContainer.value?.appendChild(renderer.domElement)

  // Post-processing
  composer = new EffectComposer(renderer)
  const renderPass = new RenderPass(scene, camera.value)
  composer.addPass(renderPass)

  // Lights
  const hemisphereLight = new HemisphereLight(0xFFCCBB, 0x080820, 0.1)
  scene.add(hemisphereLight)

  const spotLight = new SpotLight(0xF55932, 60)
  spotLight.position.set(7.5, 7.1, -11)
  spotLight.castShadow = true
  spotLight.shadow.bias = -0.0001
  spotLight.shadow.mapSize.width = 8 * 1024
  spotLight.shadow.mapSize.height = 8 * 1024
  scene.add(spotLight)

  // Background sphere
  const sphereGeometry = new SphereGeometry(100, 32, 32)
  const sphereMaterial = new MeshBasicMaterial({ color: fogColor, side: BackSide })
  const backgroundSphere = new Mesh(sphereGeometry, sphereMaterial)
  scene.add(backgroundSphere)

  // Handle resize
  window.addEventListener('resize', onWindowResize)
}

function render() {
  animate({
    onFirstFrame() {
      if (meshes.squid) {
        octoOffset = meshes.squid.position.y
      }
      if (camera.value) {
        cameraOffsetX = camera.value.rotation.x
      }
    },
    onFrameUpdate(time) {
      if (meshes.squid) {
        meshes.squid.position.y = octoOffset + Math.sin(time / 1.2) * 0.16

        if (meshes.squid.material?.uniforms?.time) {
          meshes.squid.material.uniforms.time.value = time
        }
      }

      if (camera.value) {
        camera.value.fov = 100 + Math.sin(time * 0.1) * 5
        camera.value.updateProjectionMatrix()
        camera.value.rotation.copy(cameraRotation.value)
      }
    },
  })
  composer.render()
  animationId = requestAnimationFrame(render)
}

// #### Helper functions ####

function animate(renderLifecycles: {
  onFirstFrame: () => void
  onFrameUpdate: (time: number) => void
}) {
  if (frame.value === 0) {
    renderLifecycles.onFirstFrame()
  }

  renderLifecycles.onFrameUpdate(time.value)

  time.value = window.performance.now() / 1000
  frame.value++
}

function onWindowResize() {
  const width = window.innerWidth
  const height = window.innerHeight
  windowWidth.value = width
  if (camera.value) {
    camera.value.aspect = width / height
    camera.value.updateProjectionMatrix()
  }
  renderer.setSize(width, height)
  composer.setSize(width, height)
}
</script>

<template>
  <div class="w-screen h-screen relative">
    <Transition name="fade">
      <div v-show="isSceneReady && isModelReady" ref="canvasContainer" class="w-full h-full" />
    </Transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
