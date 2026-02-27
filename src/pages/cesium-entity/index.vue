<template>
  <div class="cesium-container">
    <ViewerVue @ready="ready">
      <template v-slot="{ viewer }">
        <TiandituLayer :viewer="viewer" type="img" />
        <TiandituLayer :viewer="viewer" type="cia" />
        <Entity :viewer="viewer" :position="[116.391, 39.907, 100]" v-if="showEntity">
          <!-- <pointGraphics :pixel-size="pixelSize"/> -->
          <BoxGraphics :dimensions="[100000.0, 100000.0, 100000.0]"  :outline-color="'white'" :height-reference="Cesium.HeightReference.CLAMP_TO_GROUND"/>
        </Entity>
      </template>
    </ViewerVue>
  </div>
</template>

<script setup>
// 页面逻辑
import * as Cesium from 'cesium';
import { onMounted, ref, shallowRef } from 'vue';
import ViewerVue from '../../components/cesiumComponents/viewer.vue';
import TiandituLayer from '../../components/cesiumComponents/tiandituLayer.vue';
import Entity from '../../components/cesiumComponents/entity.vue';
import pointGraphics from '../../components/cesiumComponents/pointGraphics.vue';
import BoxGraphics from '../../components/cesiumComponents/BoxGraphics.vue';

const viewer = shallowRef()
const showEntity = ref(true)
const pixelSize = ref(100)
window.aaa = () => {
  showEntity.value = !showEntity.value
}
window.pixelSize = pixelSize
const ready = (_viewer) => {
  viewer.value = _viewer
  _viewer.camera.setView({
    destination : Cesium.Cartesian3.fromDegrees(116.391, 39.907, 15000.0)
});
}

onMounted(() => {
  console.log('cesium 页面加载完成');

});
</script>

<style scoped lang="scss">
.cesium-container {
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