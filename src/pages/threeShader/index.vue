<template>
  <div class="threeShader-container">
    <SceneThree @ready="readyScene">
      <grid />
      <Pulse v-if="showShaderType === 'Pulse'" color="red" :ringCount="6" :radius="60" />
      <RadarScann v-if="showShaderType === 'RadarScann'" color="green" :radius="60" :scanDuration="5" />
    </SceneThree>
    <div class="tools">
      <a-button @click="showType('Pulse')">辐射扩展效果</a-button>
      <a-button @click="showType('RadarScann')">雷达扫描效果</a-button>
    </div>
  </div>
</template>

<script setup>
import * as THREE from 'three';

// 页面逻辑
import { onMounted, ref } from 'vue';
import SceneThree from '../../components/threeComponents/sceneThree.vue';
import Grid from '../../components/threeComponents/grid.vue';
import Pulse from '../../components/shader/pulse.vue';
import RadarScann from '../../components/shader/RadarScann.vue';


let threeObj = null
const readyScene = ({ scene, camera, renderer, controls, addUpdate }) => {
  threeObj = { scene, camera, renderer, controls, addUpdate }
  // new MyEarth(scene)
}


const showShaderType = ref('')
const showType = type => {
  showShaderType.value = type
}


onMounted(() => {
  console.log('threeShader 页面加载完成');
});
</script>

<style scoped lang="scss">
.threeShader-container {
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