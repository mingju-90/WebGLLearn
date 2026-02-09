<template>
  <div class="cesium-container">
    <ViewerVue @ready="ready">
      <template v-slot="{ viewer }">
        <TiandituLayer :viewer="viewer" />
        <TiandituLayer :viewer="viewer" type="annotation" />
      </template>
    </ViewerVue>
    <div class="tools">
      <a-button @click="showMapType = 'satellite'">辐射扩展效果</a-button>
      <a-button @click="showMapType = 'annotation'">辐射扩展效果</a-button>
    </div>
  </div>
</template>

<script setup>
// 页面逻辑
import * as Cesium from 'cesium';
import { onMounted, ref } from 'vue';
import ViewerVue from '../../components/cesiumComponents/viewer.vue';
import TiandituLayer from '../../components/cesiumComponents/tiandituLayer.vue';
import PolylineEdgeMaterial from './directionTrackMaterial';
import GradientPolylineDashMaterial from './GradientPolylineDashMaterial';
const showMapType = ref('satellite')


const addBlueLineWithShader = (viewer) => {
  const entity = viewer.entities.add({
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArray([
        // 北京
    116.4074, 39.9042,
    // 陕西（西安）
    108.9480, 34.2631,
    // 河南（郑州）
    113.6500, 34.7579,
    // 上海
    121.4737, 31.2304
      ]),
      width: 20,
      clampToGround: true, // 强制贴地
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      // material: new DirectionTrackMaterial({
      //   backgroundColor: Cesium.Color.ROYALBLUE.withAlpha(0.7),
      //   arrowColor: Cesium.Color.YELLOW,
      //   spacing: 60,  // 每 60 像素一个箭头
      //   lineWidth: 5
      // }),
      // material: new Cesium.PolylineDashMaterialProperty({
      //   color: Cesium.Color.BLUE, // 虚线颜色（蓝色）
      //   // dashLength: 20, // 单个虚线段的长度（像素）
      //   // gapColor: Cesium.Color.TRANSPARENT, // 间隙颜色（透明）
      //   // dashPattern: 0xFFFF0000 // 可选：虚线图案（16进制，控制虚实比例）
      // }),
      material: new GradientPolylineDashMaterial(),
      // material: new PolylineEdgeMaterial() 
    }
  });
  // 定位到线段
  viewer.zoomTo(entity);
  return entity;
}

const ready = (viewer) => {
  addBlueLineWithShader(viewer)
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