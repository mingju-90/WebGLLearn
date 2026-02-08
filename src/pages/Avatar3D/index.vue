<template>
  <div class="Avatar3D-container">
    <sceneThree @ready="readyScene">
      <grid />
      <LoadGltfVue value="/glb/Xbot.glb" @loaded="loadGltf" />
    </sceneThree>
    <div class="tools">
      <a-button @click="playAction(1)">停</a-button>
      <a-button @click="playAction(2)">走</a-button>
      <a-button @click="playAction(3)">跑</a-button>
    </div>
  </div>
</template>

<script setup>
import * as THREE from 'three';

// 页面逻辑
import { onMounted } from 'vue';
import sceneThree from '../../components/threeComponents/sceneThree.vue';
import LoadGltfVue from '../../components/threeComponents/loadGltf.vue';
import grid from '../../components/threeComponents/grid.vue'
import { setModelScale } from '../../utils/threeUtils';
import { PointerLockControls } from 'three/examples/jsm/Addons.js';



// 基础动画配置（权重控制）
const baseActions = {
  idle: { weight: 1 },
  walk: { weight: 0 },
  run: { weight: 0 }
};

let currentAction, lockControls


const initLockControls = () => {
  lockControls = new PointerLockControls(threeObj.camera, document.body)
  lockControls.maxPolarAngle = Math.PI * 0.5
  lockControls.minPolarAngle = Math.PI * 0.5

  document.body.addEventListener('click', () => lockControls.lock())
}


// 初始化速度向量
const velocity = new THREE.Vector3(0, 0, 0);
// 初始化方向向量
const direction = new THREE.Vector3(0, 0, 0);
// 初始化上一帧时间
let prevTime = performance.now();

const updateLockControls = () => {
  const time = performance.now()

  prevTime = time;
}


const playAction = type => {
  if (currentAction) currentAction.setEffectiveWeight(0)
  if (type == 1) {
    baseActions.idle.setEffectiveWeight(1)
    currentAction = baseActions.idle
  } else if (type == 2) {
    baseActions.walk.setEffectiveWeight(1)
    currentAction = baseActions.walk
  } else if (type == 3) {
    baseActions.run.setEffectiveWeight(1)
    currentAction = baseActions.run
  }
}


let mixer;

let clock = new THREE.Clock();


let threeObj = null
const readyScene = ({ scene, camera, renderer, controls, addUpdate }) => {
  threeObj = { scene, camera, renderer, controls, addUpdate }
}


const createAnimationController = model => {
  mixer = new THREE.AnimationMixer(model.scene);
  model.animations.forEach(clip => {
    const name = clip.name;
    if (baseActions[name]) {
      // 把“动画数据（Clip）”转为“可控制的动画动作（Action）”
      const action = mixer.clipAction(clip)
      action.clampWhenFinished = true
      action.enabled = true
      action.setEffectiveTimeScale(1)
      action.setEffectiveWeight(0)
      baseActions[name] = action
      action.play()
    }
  })
  baseActions.run.setEffectiveWeight(1)
  currentAction = baseActions.run

  threeObj.addUpdate(() => {
    const delta = clock.getDelta();
    if (mixer) {
      mixer.update(delta);
      updateLockControls()
    }
  })
}


const loadGltf = (gltf) => {
  // 骨骼辅助线（可选显示）
  // const skeleton = new THREE.SkeletonHelper(gltf.scene);
  // threeObj.scene.add(skeleton);
  setModelScale(gltf.scene, 80)
  createAnimationController(gltf)
  // initLockControls(gltf)
}





</script>

<style scoped lang="scss">
.Avatar3D-container {
  padding: var(--spacing-base);
  height: 100%;
  position: relative;
}

.tools {
  position: absolute;
  bottom: 20px;
  right: 20px;
  display: flex;
  gap: 12px;
}
</style>