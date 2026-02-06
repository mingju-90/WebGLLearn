<template>
  <!-- 组件无 DOM 元素，仅负责 Three.js 网格的创建/销毁 -->
  <div></div>
</template>

<script setup>
import { inject, onMounted, onUnmounted, watch, ref } from 'vue';
import * as THREE from 'three';

/**
 * Three.js 网格辅助线 Vue3 组件
 * 支持自定义网格尺寸、分割数、颜色、透明度、平面方向等参数
 */
const props = defineProps({
  // 网格总尺寸（正方形边长）
  size: {
    type: Number,
    default: 100
  },
  // 网格分割数（分割越多，网格越密）
  divisions: {
    type: Number,
    default: 20
  },
  // 主网格线颜色（十六进制）
  colorPrimary: {
    type: Number,
    default: 0xcccccc // 浅灰色
  },
  // 辅助网格线颜色（十六进制）
  colorSecondary: {
    type: Number,
    default: 0x444444 // 深灰色
  },
  // 网格透明度（0-1）
  opacity: {
    type: Number,
    default: 0.2,
    validator: (v) => v >= 0 && v <= 1 // 校验值范围
  },
  // 网格平面方向（xy / xz / yz）
  plane: {
    type: String,
    default: 'xy',
    validator: (v) => ['xy', 'xz', 'yz'].includes(v) // 校验合法值
  },
  // 网格位置偏移（x/y/z）
  position: {
    type: Object,
    default: () => ({ x: 0, y: 0, z: 0 })
  },
  // 是否启用网格
  enabled: {
    type: Boolean,
    default: true
  }
});

// 注入 Three.js 场景实例（需在父组件提供 scene）
const scene = inject('scene', null);
// 存储网格实例，用于后续销毁/更新
const grid = ref(null);

/**
 * 创建网格辅助线核心方法
 */
const createGrid = () => {
  // 场景不存在时不创建
  if (!scene.value || !props.enabled) return;

  // 1. 创建网格辅助线
  const gridHelper = new THREE.GridHelper(
    props.size,
    props.divisions,
    props.colorPrimary,
    props.colorSecondary
  );

  // 2. 设置网格材质（透明+深度写入优化）
  gridHelper.material = gridHelper.material.clone(); // 克隆材质避免共享冲突
  gridHelper.material.opacity = props.opacity;
  gridHelper.material.depthWrite = false; // 修复透明渲染异常
  gridHelper.material.transparent = true;
  gridHelper.material.needsUpdate = true; // 确保材质修改生效

  // 3. 设置网格平面方向（默认xy平面）
  switch (props.plane) {
    case 'xz':
      gridHelper.rotation.x = Math.PI / 2; // 旋转到XZ平面（垂直墙面）
      break;
    case 'yz':
      gridHelper.rotation.z = Math.PI / 2; // 旋转到YZ平面
      break;
    default:
      // xy平面无需旋转（默认）
      break;
  }

  // 4. 设置网格位置偏移
  gridHelper.position.set(
    props.position.x,
    props.position.y,
    props.position.z
  );

  // 5. 禁用射线拾取（优化性能，网格一般无需点击交互）
  gridHelper.raycast = () => {};

  // 6. 添加到场景并保存实例
  scene.value.add(gridHelper);
  grid.value = gridHelper;
};

/**
 * 销毁网格辅助线
 */
const destroyGrid = () => {
  if (grid.value && scene.value) {
    // 移除材质避免内存泄漏
    if (grid.value.material) {
      grid.value.material.dispose();
    }
    // 从场景移除网格
    scene.value.remove(grid.value);
    grid.value = null;
  }
};

// 组件挂载时创建网格
onMounted(() => {
  createGrid();
});

// 组件卸载时销毁网格（防止内存泄漏）
onUnmounted(() => {
  destroyGrid();
});

// 监听 props 变化，实时更新网格
watch(
  [() => props.size, () => props.divisions, () => props.colorPrimary, () => props.colorSecondary,
   () => props.opacity, () => props.plane, () => props.position, () => props.enabled],
  () => {
    // 先销毁旧网格，再创建新网格
    destroyGrid();
    createGrid();
  },
  { deep: true } // 深度监听对象类型的 props（如 position）
);
</script>

<style scoped>
/* 组件无 DOM 元素，无需样式 */
</style>