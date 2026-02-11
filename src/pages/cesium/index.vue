<template>
  <div class="cesium-container">
    <ViewerVue @ready="ready">
      <template v-slot="{ viewer }">
        <TiandituLayer :viewer="viewer" />
        <TiandituLayer :viewer="viewer" type="annotation" />
      </template>
    </ViewerVue>
    <div class="tools">
      <a-button @click="changeMaterial('BasicWall')">围墙</a-button>
      <a-button @click="changeMaterial('DashStrokeMaterial')">流动材质</a-button>
      <a-button @click="changeMaterial('FlowingTexturePolylineMaterial')">流动纹理材质</a-button>
      <a-button @click="changeMaterial('ProgressiveTextureMaterial')">流动纹理进度材质</a-button>
      
      <a-button @click="changeMaterial('RadarSweepRingMaterial')">扩散环材质</a-button>
      <a-button @click="changeMaterial('RadarSweepMaterial')">雷达扫描材质</a-button>
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
import RadarSweepRingMaterial from '../../components/cesiumMaterial/RadarSweepRingMaterial';
import WallMaterial from '../../components/cesiumMaterial/WallMaterial';

const viewer = shallowRef()

const entity = shallowRef()

const timer = useIntervalTime();
let clearSingleTimer = null
// 添加每200ms执行1次、共执行5次的定时器

const addBasicWallEntity = () => {
  // 先移除已有实体
  removeEntity()
  
  // 围墙坐标点（非闭合也可，Wall 自动连接）
  const wallPoints = [
    116.3974, 39.9088,  // 点1
    116.4074, 39.9088,  // 点2
    116.4074, 39.9188,  // 点3
    116.3974, 39.9188   // 点4
  ];

  // 创建带厚度的围墙实体
  entity.value = viewer.value.entities.add({
    wall: {
      // 坐标转换（和 Polyline 保持一致）
      positions: Cesium.Cartesian3.fromDegreesArray(wallPoints),
      minimumHeights: Array(wallPoints.length/2).fill(0), // 底部高度（全贴地）
      maximumHeights: Array(wallPoints.length/2).fill(80), // 顶部高度（80米）
      material: new WallMaterial(), // 围墙材质
      granularity: Cesium.Math.RADIANS_PER_DEGREE, // 精度（和 Polyline 一致）
      clampToGround: true,                        // 强制贴地
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND // 高度参考
    }
  });
  
  // 定位到围墙
  viewer.value.zoomTo(entity.value);
};

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

/** 扩散环材质 */
const addRadarSweepRingMaterial = () => {
  removeEntity()
  entity.value = viewer.value.entities.add({
    position: Cesium.Cartesian3.fromDegrees(116.4074, 39.9042, 0),
    ellipse: {
      semiMajorAxis: 1000, // 长半轴（米）→ 圆形半径
      semiMinorAxis: 1000, // 短半轴（米）→ 与长半轴相等
      height: 0, // 圆形离地面的高度（米），0=贴地
      extrudedHeight: 0, // 拉伸高度（米），0=2D圆形，>0=3D圆柱
      material: new RadarSweepRingMaterial()
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
    RadarSweepRingMaterial: addRadarSweepRingMaterial,
    FlowLineMateria: addFlowLineMateria,
    ProgressiveTextureMaterial: addProgressiveTextureMaterial,
    RadarSweepMaterial: addRadarSweepMaterial,
    BasicWall: addBasicWallEntity,
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