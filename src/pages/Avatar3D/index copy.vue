<template>
  <div class="Avatar3D-container">
    <sceneThree @ready="readyScene">
      <grid />
      <LoadGltfVue value="/glb/Xbot.glb" @loaded="loadGltf" />
    </sceneThree>
  </div>
</template>

<script setup>
import * as THREE from 'three';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
// 页面逻辑
import { onMounted } from 'vue';
import sceneThree from '../../components/threeComponents/sceneThree.vue';
import LoadGltfVue from '../../components/threeComponents/loadGltf.vue';
import grid from '../../components/threeComponents/grid.vue'

onMounted(() => {
  console.log('Avatar3D 页面加载完成');
});

// 基础动画配置（权重控制）
const baseActions = {
  idle: { weight: 1 },
  walk: { weight: 0 },
  run: { weight: 0 }
};
// 叠加动画配置（可叠加在基础动画上）
const additiveActions = {
  sneak_pose: { weight: 0 },
  sad_pose: { weight: 0 },
  agree: { weight: 0 },
  headShake: { weight: 0 }
};
const crossFadeControls = []; // 淡入淡出控制项
let panelSettings, numAnimations, mixer, clock;

let currentBaseAction = 'idle';
const allActions = []; // 所有动画动作集合

let threeObj = null
const readyScene = ({ scene, camera, renderer, controls }) => {
  threeObj = { scene, camera, renderer, controls }
  clock = new THREE.Clock();
}

const loadGltf = (gltf) => {
  console.log('gltf', gltf)
  // 骨骼辅助线（可选显示）
  const skeleton = new THREE.SkeletonHelper(gltf.scene);
  // skeleton.visible = false;
  threeObj.scene.add(skeleton);
  // 4. 动画混合器初始化：管理多动画混合
  mixer = new THREE.AnimationMixer(gltf.scene);
  numAnimations = gltf.animations.length;

  // 5. 解析动画剪辑，区分基础动画/叠加动画
  gltf.animations.forEach((clip) => {
    const name = clip.name;
    // 基础动画（idle/walk/run）：互斥播放
    if (baseActions[name]) {
      const action = mixer.clipAction(clip);
      activateAction(action); // 激活并设置权重
      baseActions[name].action = action;
      allActions.push(action);
    }
    // 叠加动画：可叠加在基础动画上（如姿态、表情）
    else if (additiveActions[name]) {
      // 转为叠加动画（核心：移除参考帧，只保留相对变化）
      THREE.AnimationUtils.makeClipAdditive(clip);
      // 针对pose类动画，截取关键帧（2-3帧，30fps）
      if (name.endsWith('_pose')) {
        clip = THREE.AnimationUtils.subclip(clip, name, 2, 3, 30);
      }
      const action = mixer.clipAction(clip);
      activateAction(action);
      additiveActions[name].action = action;
      allActions.push(action);
      threeObj.renderer.setAnimationLoop(animate);
    }
  });

  createPanel()
}
const setWeight = (action, weight) => {
  action.enabled = true;
  action.setEffectiveTimeScale(1); // 重置时间缩放
  action.setEffectiveWeight(weight); // 设置有效权重
};
/**
 * 激活动画：设置权重并播放
 * @param {THREE.AnimationAction} action - 动画动作
 */
const activateAction = (action) => {
  const clip = action.getClip();
  const settings = baseActions[clip.name] || additiveActions[clip.name];
  setWeight(action, settings.weight); // 设置初始权重
  action.play(); // 播放动画
};
/**
 * 创建GUI控制面板：核心是动画切换和权重调整
 */
const createPanel = () => {
  const panel = new GUI({ width: 310 });
  const folder1 = panel.addFolder('Base Actions'); // 基础动画切换
  const folder2 = panel.addFolder('Additive Action Weights'); // 叠加动画权重
  const folder3 = panel.addFolder('General Speed'); // 全局动画速度

  panelSettings = { 'modify time scale': 1.0 };
  const baseNames = ['None', ...Object.keys(baseActions)];

  // 1. 基础动画切换按钮：点击触发淡入淡出
  baseNames.forEach((name) => {
    panelSettings[name] = () => {
      const currentSettings = baseActions[currentBaseAction];
      const currentAction = currentSettings?.action;
      const targetAction = baseActions[name]?.action;
      // 不同动画之间执行淡入淡出
      if (currentAction !== targetAction) {
        prepareCrossFade(currentAction, targetAction, 0.35);
      }
    };
    crossFadeControls.push(folder1.add(panelSettings, name));
  });

  // 2. 叠加动画权重调整：实时修改动画权重
  Object.keys(additiveActions).forEach((name) => {
    const settings = additiveActions[name];
    panelSettings[name] = settings.weight;
    folder2.add(panelSettings, name, 0.0, 1.0, 0.01)
      .listen()
      .onChange((weight) => {
        setWeight(settings.action, weight); // 设置动画有效权重
        settings.weight = weight;
      });
  });

  // 3. 全局动画速度调整：修改混合器时间缩放
  folder3.add(panelSettings, 'modify time scale', 0.0, 1.5, 0.01)
    .onChange((speed) => {
      mixer.timeScale = speed;
    });

  // 初始化面板样式：未激活的动画按钮置灰
  crossFadeControls.forEach((control) => {
    control.setInactive = () => control.domElement.classList.add('control-inactive');
    control.setActive = () => control.domElement.classList.remove('control-inactive');
    const settings = baseActions[control.property];
    if (!settings || !settings.weight) control.setInactive();
  });

  folder1.open();
  folder2.open();
  folder3.open();
};

/**
 * 准备动画淡入淡出：区分idle动画（立即切换）和其他动画（等待循环结束）
 * @param {THREE.AnimationAction} startAction - 起始动画
 * @param {THREE.AnimationAction} endAction - 目标动画
 * @param {number} duration - 淡入淡出时长
 */
const prepareCrossFade = (startAction, endAction, duration) => {
  // idle动画可立即切换，其他动画需等待当前循环结束
  if (currentBaseAction === 'idle' || !startAction || !endAction) {
    executeCrossFade(startAction, endAction, duration);
  } else {
    synchronizeCrossFade(startAction, endAction, duration);
  }

  // 更新当前基础动画状态和GUI样式
  currentBaseAction = endAction ? endAction.getClip().name : 'None';
  crossFadeControls.forEach((control) => {
    control.property === currentBaseAction ? control.setActive() : control.setInactive();
  });
};
/**
 * 执行淡入淡出：核心动画混合逻辑
 */
const executeCrossFade = (startAction, endAction, duration) => {
  if (endAction) {
    setWeight(endAction, 1); // 目标动画权重设为1
    endAction.time = 0; // 重置动画时间
    if (startAction) {
      // 有起始动画：交叉淡入淡出（支持时间扭曲）
      startAction.crossFadeTo(endAction, duration, true);
    } else {
      // 无起始动画：直接淡入目标动画
      endAction.fadeIn(duration);
    }
  } else if (startAction) {
    // 无目标动画：淡出当前动画
    startAction.fadeOut(duration);
  }
};


/**
 * 同步淡入淡出：等待当前动画循环结束后执行
 */
const synchronizeCrossFade = (startAction, endAction, duration) => {
  const onLoopFinished = (event) => {
    if (event.action === startAction) {
      mixer.removeEventListener('loop', onLoopFinished);
      executeCrossFade(startAction, endAction, duration);
    }
  };
  mixer.addEventListener('loop', onLoopFinished);
};


/**
 * 渲染循环：更新动画混合器和场景
 */
const animate = () => {
  // 同步所有动画的权重到配置对象（用于GUI显示）
  allActions.forEach((action) => {
    const clip = action.getClip();
    const settings = baseActions[clip.name] || additiveActions[clip.name];
    settings.weight = action.getEffectiveWeight();
  });

  // 更新动画混合器（传入帧间隔时间）
  const delta = clock.getDelta();
  mixer.update(delta);

  // 渲染场景 + 更新性能面板
  threeObj.renderer.render(threeObj.scene, threeObj.camera);
};

</script>

<style scoped lang="scss">
.Avatar3D-container {
  padding: var(--spacing-base);
  height: 100%;
  position: relative;
}
</style>