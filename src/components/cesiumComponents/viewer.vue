<template>
    <div class="container" ref="containerRef">
        <slot v-if="isReady" :viewer="viewer"/>
    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, shallowRef, onUnmounted } from 'vue'
import * as Cesium from 'cesium';

// Props 定义
const props = defineProps({})

const containerRef = ref()

const viewer = shallowRef()
const isReady = ref(false)

// 事件定义
const emits = defineEmits(['ready', 'destroyed'])

const getDefaultViewerOptions = () => {
  // 基础默认配置：隐藏不必要的控件，优化性能
  const baseOptions = {
    // 禁用默认的 Bing 地图底图（避免密钥问题）
    imageryProvider: false,
    geocoder: false,
    // 隐藏自带的控件
    homeButton: false, // 是否显示主页按钮
    sceneModePicker: false, // 是否显示场景模式切换（2D/3D）
    baseLayerPicker: false, // 隐藏底图选择器
    navigationHelpButton: false, // 隐藏导航帮助按钮
    animation: false, // 隐藏动画控件
    timeline: false, // 隐藏时间轴
    fullscreenButton: false, // 是否显示全屏按钮
    vrButton: false, // 隐藏 VR 按钮
    // 性能优化
    requestRenderMode: false, // 按需渲染（提升性能）
    maximumRenderTimeChange: Infinity,
    // 地形配置（默认加载 Cesium 全球地形）
    // terrainProvider: Cesium.createWorldTerrain({
    //   requestWaterMask: false, // 显示水面效果
    //   requestVertexNormals: false // 提升地形光照效果
    // })
  }

  // 合并默认配置和用户传入的配置（用户配置优先级更高）
  return { ...baseOptions, ...props.viewerOptions }
}

const initCesium = () => {
    Cesium.Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxYjQ0NWI2Yi0zOTFiLTRkYzAtODFlNS1iNTQ2NzAwNTI5N2QiLCJpZCI6MTgyMTk3LCJpYXQiOjE3MDE1OTQ3OTJ9.pTuIpfzcMZB-z301bqrHrLPk8PXiVFPfptLFa5E1bFM"
    viewer.value = new Cesium.Viewer(containerRef.value, getDefaultViewerOptions());
    isReady.value = true
    emits('ready', viewer.value)
}

const destroyCesium = () => {
  if (viewer.value) {
    // 销毁 Viewer 实例，释放资源
    viewer.value.destroy()
    viewer.value = null
    isReady.value = false
    emits('destroyed')
    console.log('Cesium 实例已销毁')
  }
}

// 生命周期
onMounted(() => {
    console.log('组件挂载完成')
    initCesium()
})
onUnmounted(() => {
  destroyCesium()
})
</script>

<style scoped lang="scss">
.container {
    // 样式
    height: 100%;
    position: relative;
}
</style>
