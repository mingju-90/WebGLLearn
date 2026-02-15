<template>
  <div class="learning-cesium-shader-container">
    <ViewerVue @ready="ready">
      <template v-slot="{ viewer }">
        <TiandituLayer :viewer="viewer" type="img"/>
        <TiandituLayer :viewer="viewer" type="cia" />
      </template>
    </ViewerVue>
    <div class="tools">
      <a-dropdown>
        <a-button>{{ showShaderType }}</a-button>
        <template #overlay>
          <a-menu>
            <template v-for="menu in menuList">
              <a-sub-menu v-if="menu.children && menu.children.length" :key="menu.key" :title="menu.title">
                <a-menu-item v-for="childMeun of menu.children" @click="changeShowShader(childMeun)">{{ childMeun.title
                }}</a-menu-item>
              </a-sub-menu>
              <a-menu-item v-else>{{ menu.title }}</a-menu-item>
            </template>
          </a-menu>
        </template>
      </a-dropdown>
      <a-card v-if="materialFormList.length" title="修改材质" style="width: 300px; margin-top: 20px;">
        <div class="form-list">
          <div v-for="item of materialFormList" class="form-item">
            <div class="label">{{ item.label }}</div>
            <div class="value">
              <a-input v-model:value="materialOption[item.prop]" @pressEnter="item.change" />
            </div>
          </div>
        </div>
      </a-card>

    </div>
  </div>
</template>

<script setup>
// 页面逻辑
import * as Cesium from 'cesium';
import { computed, onMounted, ref, shallowRef } from 'vue';
import ViewerVue from '../../components/cesiumComponents/viewer.vue';
import TiandituLayer from '../../components/cesiumComponents/tiandituLayer.vue';
import SolidGradientMaterial from '../../components/cesiumMaterial/SolidGradientMaterial';
import GridMaterial from '../../components/cesiumMaterial/GridMaterial';
import BreathingLightMaterial from '../../components/cesiumMaterial/BreathingLightMaterial';
import FlowLineMaterial from '../../components/cesiumMaterial/FlowLineMaterial';


const showShaderType = ref('选择展示材质')

const menuList = [
  {
    title: '基础入门级', key: '基础入门级', children: [
      { title: '纯色渐变背景（矩形 / 球体）', key: 'SolidGradientMaterial', remark: '在 Cesium 矩形实体上实现「从红到蓝的线性渐变」，渐变方向可通过参数控制（水平 / 垂直 / 对角线）；' },
      { title: '网格纹理（贴地 / 悬浮）', key: 'GridMaterial' },
      { title: '呼吸灯效果（点 / 圆形）', key: 'BreathingLightMaterial' },
      { title: '流动线段', key: 'FlowLineMaterial' },
    ]
  }
]

const viewer = shallowRef()
const ready = (_viewer) => {
  viewer.value = _viewer
  changeShowShader(menuList[0].children[3])
}




const materialFormList = ref([])

const materialOption = ref({})
const changeShowShader = value => {
  showShaderType.value = value.title
  console.log('changeShowShader', value)
  const map = {
    SolidGradientMaterial: showSolidGradientMaterial,
    GridMaterial: showGridMaterial,
    BreathingLightMaterial: showBreathingLightMaterial,
    FlowLineMaterial: showFlowLineMaterial,
  }

  if (map[value.key]) map[value.key]()
  // SolidGradientMaterial

}


const entity = shallowRef()
const removeEntity = () => {
  // if(clearSingleTimer) {
  //   clearSingleTimer()
  //   clearSingleTimer = null
  // }
  if (!entity.value) return
  viewer.value.entities.remove(entity.value)
  entity.value = null
}
const showSolidGradientMaterial = () => {
  removeEntity()
  materialFormList.value = [
    { label: '渐变角度', prop: 'gradientDirection', change: () => entity.value.rectangle.material.setGradientDirection(Number(materialOption.value.gradientDirection)) },
    { label: '起始颜色', prop: 'startColor', change: () => entity.value.rectangle.material.setStartColor(materialOption.value.startColor) },
    { label: '结束颜色', prop: 'endColor', change: () => entity.value.rectangle.material.setEndColor(materialOption.value.endColor) },
  ]
  materialOption.value = {
    gradientDirection: 0,
    startColor: 'red',
    endColor: 'blue'
  }
  entity.value = viewer.value.entities.add({
    rectangle: {
      coordinates: new Cesium.Rectangle(
        Cesium.Math.toRadians(116.3),
        Cesium.Math.toRadians(39.8),
        Cesium.Math.toRadians(116.5),
        Cesium.Math.toRadians(40)
      ),
      material: new SolidGradientMaterial(materialOption.value),
      outline: true,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2,
      height: 0
    }
  });
  // 定位到矩形
  viewer.value.zoomTo(entity.value);
}
const showGridMaterial = () => {
  removeEntity()
  materialFormList.value = [
    { label: '网格数', prop: 'gridCount', change: () => entity.value.rectangle.material.setGridCount(Number(materialOption.value.gridCount)) },
    { label: '奇数颜色', prop: 'oddColor', change: () => entity.value.rectangle.material.setOddColor(materialOption.value.oddColor) },
    { label: '偶数颜色', prop: 'evenColor', change: () => entity.value.rectangle.material.setEvenColor(materialOption.value.evenColor) },
  ]
  materialOption.value = {
    gridCount: 10000,
    oddColor: 'red',
    evenColor: 'blue'
  }
  entity.value = viewer.value.entities.add({
    rectangle: {
      coordinates: new Cesium.Rectangle(
        Cesium.Math.toRadians(116.3),
        Cesium.Math.toRadians(39.8),
        Cesium.Math.toRadians(116.5),
        Cesium.Math.toRadians(40)
      ),
      material: new GridMaterial(materialOption.value),
      outline: true,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2,
      height: 0
    }
  });
  // 定位到矩形
  viewer.value.zoomTo(entity.value);
}
const showBreathingLightMaterial = () => {
  removeEntity()
  materialFormList.value = [
    { label: '颜色', prop: 'color', change: () => entity.value.ellipse.material.setColor(materialOption.value.color) },
    { label: '呼吸速度', prop: 'speed', change: () => entity.value.ellipse.material.setSpeed(Number(materialOption.value.speed)) },
  ]
  materialOption.value = {
    color: 'blue',
    speed: 2,
  }
  entity.value = entity.value = viewer.value.entities.add({
    position: Cesium.Cartesian3.fromDegrees(116.4, 39.9),
    ellipse: {
      semiMajorAxis: 50000,
      semiMinorAxis: 50000,
      material: new BreathingLightMaterial(materialOption.value),
      height: 0
    }
  });
  console.log('dfad')
  // 定位到矩形
  viewer.value.zoomTo(entity.value);
}

const showFlowLineMaterial = () => {
  removeEntity()
  entity.value = viewer.value.entities.add({
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArray([116.3, 39.8, 116.5, 40]),
      width: 5,
      material: new FlowLineMaterial({
        color: 'red',
        speed: 1,
        percent: 0.1,
      }),
      clampToGround: true
    }
  });
  // 定位到线段
  viewer.value.zoomTo(entity.value);
}

onMounted(() => {
  console.log('learning-cesium-shader 页面加载完成');
});


</script>

<style scoped lang="scss">
.learning-cesium-shader-container {
  padding: var(--spacing-base);
  height: 100%;
  position: relative;
}

.tools {
  position: absolute;
  top: 20px;
  right: 20px;
}

.form-list {
  display: flex;
  flex-direction: column;
  gap: 8px;

  .form-item {
    display: flex;
    gap: 8px;
    align-items: center;

    .label {
      width: 100px;
    }
  }
}
</style>