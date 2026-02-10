<template>
  <div class="cesium-container">
    <ViewerVue @ready="ready">
      <template v-slot="{ viewer }">
        <TiandituLayer :viewer="viewer" />
        <TiandituLayer :viewer="viewer" type="annotation" />
      </template>
    </ViewerVue>
    <div class="tools">
      <a-button @click="changeMaterial('DashStrokeMaterial')">流动材质</a-button>
      <a-button @click="changeMaterial('FlowingTexturePolylineMaterial')">流动纹理材质</a-button>
      <a-button @click="changeMaterial('ProgressiveTextureMaterial')">流动纹理进度材质</a-button>
      
      <a-button @click="changeMaterial('RadarSweepMaterial')">扩散环材质</a-button>
      <a-button @click="changeMaterial('FlowLineMateria')">流动纹理材质</a-button>
    </div>
  </div>
</template>

<script setup>
// 页面逻辑
import * as Cesium from 'cesium';
import { onMounted, ref, shallowRef } from 'vue';
import ViewerVue from '../../components/cesiumComponents/viewer.vue';
import TiandituLayer from '../../components/cesiumComponents/tiandituLayer.vue';
import PolylineEdgeMaterial from './directionTrackMaterial';
import ProgressiveTextureMaterial from '../../components/cesiumMaterial/ProgressiveTextureMaterial';
import FlowingTexturePolylineMaterial from '../../components/cesiumMaterial/FlowingTexturePolylineMaterial';
import FlowLineMateria from '../../components/cesiumMaterial/FlowLineMateria';
import RadarSweepMaterial from '../../components/cesiumMaterial/RadarSweepMaterial';
import DashStrokeMaterial from '../../components/cesiumMaterial/DashStrokeMaterial';
import { useIntervalTime } from '../../utils/threeIndex';

const viewer = shallowRef()

const entity = shallowRef()

const timer = useIntervalTime();
let clearSingleTimer = null
// 添加每200ms执行1次、共执行5次的定时器


/** 流动材质 */
const addDashStrokeMaterial = () => {
  removeEntity()
  entity.value = viewer.value.entities.add({
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
      width: 10,
      clampToGround: true, // 强制贴地
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      material: new DashStrokeMaterial({
        speed: 1,
      }),
    },
  });
  // 定位到线段
  viewer.value.zoomTo(entity.value);
}
/** 流动纹理材质 */
const addProgressiveTextureMaterial = () => {
  removeEntity()
  let progress = 0
  entity.value = viewer.value.entities.add({
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
      width: 10,
      clampToGround: true, // 强制贴地
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      material: new ProgressiveTextureMaterial({
        progress,
      }),
    },
  });
  clearSingleTimer = timer.interval(() => {
    progress += 0.1
    if(progress > 100) progress = 0
    entity.value.polyline.material.setProgress(progress)
  }, 1000 / 60);
  // 定位到线段
  viewer.value.zoomTo(entity.value);
}
const addFlowingTexturePolylineMaterial = () => {
  removeEntity()
  
  entity.value = viewer.value.entities.add({
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
      width: 10,
      clampToGround: true, // 强制贴地
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      material: new FlowingTexturePolylineMaterial(),
    },
  });
  viewer.value.zoomTo(entity.value);
}
/** 扩散环材质 */
const addRadarSweepMaterial = () => {
  removeEntity()
  entity.value = viewer.value.entities.add({
    position: Cesium.Cartesian3.fromDegrees(116.4074, 39.9042, 0),
    ellipse: {
      semiMajorAxis: 1000, // 长半轴（米）→ 圆形半径
      semiMinorAxis: 1000, // 短半轴（米）→ 与长半轴相等
      height: 0, // 圆形离地面的高度（米），0=贴地
      extrudedHeight: 0, // 拉伸高度（米），0=2D圆形，>0=3D圆柱
      material: new RadarSweepMaterial()
    }
  });
  // 定位到线段
  viewer.value.zoomTo(entity.value);
}

/** 流动材质 */
const addFlowLineMateria = () => {
  removeEntity()
  entity.value = viewer.value.entities.add({
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
      width: 10,
      clampToGround: true, // 强制贴地
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      material: new FlowLineMateria({
        speed: 1,
      }),
    },
  });
  // 定位到线段
  viewer.value.zoomTo(entity.value);
}

const removeEntity = () => {
  if(clearSingleTimer) {
    clearSingleTimer()
    clearSingleTimer = null
  }
  if(!entity.value) return
  viewer.value.entities.remove(entity.value)
  entity.value = null
}

const changeMaterial = (type) => {
  const map = {
    DashStrokeMaterial: addDashStrokeMaterial,
    FlowingTexturePolylineMaterial: addFlowingTexturePolylineMaterial,
    RadarSweepMaterial: addRadarSweepMaterial,
    FlowLineMateria: addFlowLineMateria,
    ProgressiveTextureMaterial: addProgressiveTextureMaterial
  }
  map[type]()
}

const ready = (_viewer) => {
  viewer.value = _viewer
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