import type { BufferGeometry } from 'three'
import { BackSide, Color, Group, Mesh, MeshBasicMaterial, MeshPhongMaterial, ShaderMaterial } from 'three'
import { DRACOLoader, GLTFLoader } from 'three/examples/jsm/Addons.js'
import { reactive, ref, shallowRef } from 'vue'
import FogGlowFragmentShader from '@/assets/shaders/fogGlow.frag.glsl?raw'
import FogGlowVertexShader from '@/assets/shaders/fogGlow.vert.glsl?raw'

export const fogColor = new Color(0x160C84)

const isModelReady = ref(false)
const gltfModel = shallowRef<Group | null>(null)
const meshes = reactive({
  floor: null as Mesh<BufferGeometry, MeshPhongMaterial> | null,
  squid: null as Mesh<BufferGeometry, ShaderMaterial> | null,
})

export function useModel({ onSuccess }: { onSuccess?: (model: Group) => void } = {}) {
  if (!gltfModel.value) {
    loadModel()
  }
  return { gltfModel, meshes, isModelReady }

  async function loadModel() {
    try {
      const loader = new GLTFLoader()
      const dracoLoader = new DRACOLoader()
      dracoLoader.setDecoderPath('/draco/')
      loader.setDRACOLoader(dracoLoader)

      loader.loadAsync('/models/see.gltf').then((gltf) => {
        const modelGroup = new Group()

        // Copy children
        const children = gltf.scene.children.slice()
        children.forEach((child) => {
          gltf.scene.remove(child)
          modelGroup.add(child)
        })

        // Process meshes
        let meshIndex = 0
        modelGroup.traverse((node) => {
          if (node.type === 'Mesh') {
            const mesh = node as Mesh

            // Ensure materials updated and safe texture tweaks
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
            materials.forEach((material) => {
              if (!material) {
                return
              }
              material.needsUpdate = true
            })
            mesh.castShadow = true
            mesh.receiveShadow = true

            // Floor
            if (meshIndex === 0) {
              mesh.material = new MeshPhongMaterial({
                color: 0xC2B280,
                specular: 0x050505,
                shininess: 1000,
              })
              meshes.floor = mesh as Mesh<BufferGeometry, MeshPhongMaterial>
            }

            // Hide skybox
            if (meshIndex++ === 1) {
              mesh.visible = false
              return
            }

            // Squid
            if (meshIndex === 528) {
              const fogAwareGlowMaterial = new ShaderMaterial({
                uniforms: {
                  color: { value: new Color(0xFF3010) },
                  emissiveIntensity: { value: 4.0 }, // Higher for better bloom pickup
                  fogColor: { value: fogColor },
                  fogNear: { value: -2 },
                  fogFar: { value: 19 },
                  time: { value: 0 },
                },
                vertexShader: FogGlowVertexShader,
                fragmentShader: FogGlowFragmentShader,
                fog: true,
              })

              mesh.material = fogAwareGlowMaterial
              mesh.receiveShadow = false
              mesh.castShadow = true

              // Add glowing shell around squid
              if (mesh.geometry) {
                const shellGeometry = mesh.geometry.clone()
                const shellMaterial = new MeshBasicMaterial({
                  color: 0x0066FF,
                  transparent: true,
                  opacity: 0.2,
                  side: BackSide,
                })
                const shell = new Mesh(shellGeometry, shellMaterial)
                shell.scale.setScalar(1.05)
                mesh.add(shell)
              }
              meshes.squid = mesh as Mesh<BufferGeometry, ShaderMaterial>
            }
          }
        })

        gltfModel.value = modelGroup
        isModelReady.value = true
        onSuccess?.(modelGroup)
      })
    }
    catch (error) {
      console.error('Error loading GLTF model:', error)
    }
  }
}
