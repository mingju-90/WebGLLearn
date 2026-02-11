<template>
  <div class="learning-cesium-shader-container">
    <ViewerVue @ready="ready">
      <template v-slot="{ viewer }">
        <TiandituLayer :viewer="viewer" />
        <TiandituLayer :viewer="viewer" type="annotation" />
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
      <a-card v-if="materialFormList.length" title="修改渐变背景材质" style="width: 300px; margin-top: 20px;">
        <div class="form-list">
          <div v-for="item of materialFormList" class="form-item">
            <div class="label">{{ item.label }}</div>
            <div class="value">
              <a-input v-model:value="materialOption[item.prop]" @pressEnter="item.change"/>
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

const showShaderType = ref('选择展示材质')

const menuList = [
  {
    title: '基础入门级', key: '基础入门级', children: [
      { title: '纯色渐变背景（矩形 / 球体）', key: 'SolidGradientMaterial', remark: '在 Cesium 矩形实体上实现「从红到蓝的线性渐变」，渐变方向可通过参数控制（水平 / 垂直 / 对角线）；' },
      { title: '网格纹理（贴地 / 悬浮）', key: '' },
      { title: ' 呼吸灯效果（点 / 圆形）', key: '' },
    ]
  }
]

const viewer = shallowRef()
const ready = (_viewer) => {
  viewer.value = _viewer
}

const materialFormList = ref([])

const materialOption = ref({})
const changeShowShader = value => {
  showShaderType.value = value.title
  console.log('changeShowShader', value)
  const map = {
    SolidGradientMaterial: showSolidGradientMaterial
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
    {label: '渐变角度', prop: 'gradientDirection', change: () => entity.value.rectangle.material.setGradientDirection(Number(materialOption.value.gradientDirection))},
    {label: '起始颜色', prop: 'startColor', change: () => entity.value.rectangle.material.setStartColor(materialOption.value.startColor)},
    {label: '结束颜色', prop: 'endColor', change: () => entity.value.rectangle.material.setEndColor(materialOption.value.endColor)},
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