<template>
  <div class="threeShader-container">
    <SceneThree @ready="readyScene">
      <grid />
      <Pulse color="red" :ringCount="6" :radius="60"/>
       <RadarScann color="red" :radius="60" :scanDuration="5"/>
    </SceneThree>
  </div>
</template>

<script setup>
import * as THREE from 'three';

// 页面逻辑
import { onMounted } from 'vue';
import SceneThree from '../../components/threeComponents/sceneThree.vue';
import Grid from '../../components/threeComponents/grid.vue';
import Pulse from '../../components/shader/pulse.vue';
import RadarScann from '../../components/shader/RadarScann.vue';


let threeObj = null
const readyScene = ({ scene, camera, renderer, controls, addUpdate }) => {
  threeObj = { scene, camera, renderer, controls, addUpdate }
  // new MyEarth(scene)
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
</style>