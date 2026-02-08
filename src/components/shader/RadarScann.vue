<template>
  <div class="container"></div>
</template>

<script setup>
import * as THREE from 'three';
import { ref, reactive, computed, onMounted, onUnmounted, inject, shallowRef } from 'vue'
import { colorStringToRgb } from '../../utils';

// Props 定义
const props = defineProps({
    // 自定义颜色（支持 red/#ccc/rgb(255,0,0) 等格式）
    color: {
        type: String,
        default: '#00ff80' // 默认青绿色
    },
    // 雷达平面半径
    radius: {
        type: Number,
        default: 10
    },
    // 扫描一圈的秒数（核心：传入2代表2秒扫一圈）
    scanDuration: {
        type: Number,
        default: 2
    }
})

// 注入 Three.js 场景实例
const scene = inject('scene', null);
const addUpdate = inject('addUpdate', () => { })
const removeUpdate = inject('removeUpdate', () => { })

// 保存Three.js核心对象引用（用于销毁清理）
const planeRef = shallowRef(null);       // 雷达平面网格
const materialRef = shallowRef(null);   // 着色器材质
const geometryRef = shallowRef(null);   // 平面几何体
let updateCallback = null;              // 动画回调引用

// 计算每秒旋转的弧度（一圈2π弧度 / 扫描秒数）
const rotateRadianPerSecond = computed(() => {
    // 避免传入0导致计算错误
    const duration = Math.max(props.scanDuration, 0.1);
    return (2 * Math.PI) / duration;
});

const init = () => {
    if (!scene?.value) {
        console.error('未注入有效的 Three.js Scene 实例');
        return;
    }
    
    // 解析自定义颜色为 RGB 数组（0.0~1.0）
    const customRgb = colorStringToRgb(props.color);
    const { radius } = props;
    
    // 创建和半径匹配的平面（保存引用）
    const geometry = new THREE.PlaneGeometry(radius * 2, radius * 2);
    geometryRef.value = geometry;

    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0.0 },
            uCustomColor: { value: new THREE.Vector3(...customRgb) },
            // 传入雷达半径（用于匹配扫描范围）
            uRadius: { value: radius },
            // 传入每秒旋转弧度（核心：控制扫描速度）
            uRotateRadianPerSecond: { value: rotateRadianPerSecond.value }
        },
        vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            vec4 modelPosition = modelMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * viewMatrix * modelPosition;
        }
        `,
        fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;
        uniform vec3 uCustomColor;
        uniform float uRadius;
        uniform float uRotateRadianPerSecond;

        float drawSector(vec2 vUv, float radius) {
            // 核心修改：基于传入的每秒弧度计算旋转角度
            float angle = uTime * uRotateRadianPerSecond;
            vec2 newvUv = mat2(cos(angle), sin(angle), -sin(angle), cos(angle)) * vUv;

            vec2 x = vec2(1.0, 0.0);
            vec2 y = vec2(0.0, 1.0);
            float res = dot(newvUv, y);
            float angle2 = acos(dot(x, normalize(newvUv)));

            float inSector = 0.0;
            // 适配半径：扫描范围和平面尺寸匹配（0.45改为相对值）
            float scanRadius = 0.45 * radius;
            if (angle2 > 0.0 && angle2 < 1.5707 && length(newvUv) < scanRadius && res > 0.0) {
                inSector = 1.0 - smoothstep(0.0, 1.5707, angle2);
                // 径向渐变：距离越远越暗，适配半径
                // inSector *= 1.0 - smoothstep(0.0, scanRadius, length(newvUv));
            }
            return inSector;
        }

        void main() {
            vec2 newvUv = vUv;
            // UV 中心化：适配不同半径的平面
            newvUv -= vec2(0.5);
            // 缩放UV：让扫描范围和平面尺寸匹配
            newvUv *= uRadius;

            vec3 color = vec3(0.0);
            float sector = drawSector(newvUv, uRadius);
            color += sector;

            gl_FragColor = vec4(color * uCustomColor, 1.0);
        }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
    });
    materialRef.value = material;

    const plane = new THREE.Mesh(geometry, material);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = 0;
    scene.value.add(plane);
    planeRef.value = plane;

    // 保存动画回调引用（用于销毁时移除）
    updateCallback = () => {
        material.uniforms.uTime.value += 0.01;
        material.uniforms.uRotateRadianPerSecond.value = rotateRadianPerSecond.value;
    };
    // 注册动画回调
    addUpdate(updateCallback);
};

// 资源清理核心函数
const cleanUpResources = () => {
    // 1. 移除动画更新回调（关键：停止动画逻辑）
    if (updateCallback) {
        removeUpdate(updateCallback);
        updateCallback = null;
    }

    // 2. 从场景中移除雷达平面
    if (scene?.value && planeRef.value) {
        scene.value.remove(planeRef.value);
        // 解除网格对几何体/材质的引用
        planeRef.value.geometry = null;
        planeRef.value.material = null;
        planeRef.value = null;
    }

    // 3. 释放材质资源（GPU显存）
    if (materialRef.value) {
        materialRef.value.dispose();
        // 清理uniforms中可能的可释放资源
        Object.values(materialRef.value.uniforms).forEach(uniform => {
            if (uniform.value && typeof uniform.value.dispose === 'function') {
                uniform.value.dispose();
            }
        });
        materialRef.value = null;
    }

    // 4. 释放几何体资源（GPU显存）
    if (geometryRef.value) {
        geometryRef.value.dispose();
        geometryRef.value = null;
    }

    console.log('雷达组件资源已全部清理');
};

// 组件挂载后初始化
onMounted(() => {
    console.log('组件挂载完成，扫描一圈耗时：', props.scanDuration, '秒');
    init();
});

// 组件卸载时强制清理所有资源
onUnmounted(() => {
    cleanUpResources();
});
</script>

<style scoped lang="scss">
.container {
  // 样式
}
</style>