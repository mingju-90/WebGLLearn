<template>
    <div class="container"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, inject, watch } from 'vue'
import * as THREE from 'three';

// Props 定义（可扩展配置项）
const props = defineProps({
    // 可选：外部传入轨迹点
    points: {
        type: Array,
        default: () => [
            [0, 0, 0], [5, 0, 0], [5, 5, 0], [3, 8, 0],
            [0, 8, 0], [0, 5, 0], [-5, 5, 0], [-5, 0, 0], [0, 0, 0]
        ]
    },
    // 线条样式配置（支持外部覆盖）
    lineWidth: {
        type: Number,
        default: 12
    },
    blueBaseColor: {
        type: String,
        default: 'red'
    },
    whiteDashColor: {
        type: String,
        default: '#ffffff'
    },
    dashLength: {
        type: Number,
        default: 25
    },
    dashGap: {
        type: Number,
        default: 15
    }
})

// 注入 Three.js 核心实例
const scene = inject('scene', null);
const addUpdate = inject('addUpdate', () => { })
const removeUpdate = inject('removeUpdate', () => { })

// 核心配置（合并Props和默认值）
const CONFIG = {
    points: props.points,
    lineWidth: props.lineWidth,
    blueBaseRatio: 1.0,
    whiteDashRatio: 0.2,
    dashLength: props.dashLength,
    dashGap: props.dashGap,
    blueBaseColor: props.blueBaseColor,
    whiteDashColor: props.whiteDashColor
};

// 保存核心对象引用（用于销毁）
let trajectoryLine = null;
let lineGeometry = null;
let lineMaterial = null;
let resizeCallback = null;

// 颜色转换工具函数
const hexToVec3 = (colorStr) => {
    const color = new THREE.Color(colorStr);
    return new THREE.Vector3(color.r, color.g, color.b);
};

// 计算线条累计长度（用于虚线纹理）
const calculateLineLengths = (points) => {
    const lineLengths = [];
    let currentLength = 0;
    lineLengths.push(0); // 第一个点长度为0

    for (let i = 1; i < points.length; i++) {
        const prev = new THREE.Vector3(...points[i - 1]);
        const curr = new THREE.Vector3(...points[i]);
        currentLength += prev.distanceTo(curr);
        lineLengths.push(currentLength);
    }

    // 扩展长度数组（适配 Line 几何体的顶点结构）
    const expandedLengths = [];
    lineLengths.forEach(len => {
        expandedLengths.push(len);
        expandedLengths.push(len);
    });
    return expandedLengths;
};

// 创建轨迹线条（核心方法）
const createTrajectoryLine = () => {
    // 空值校验：确保scene注入成功
    if (!scene?.value) {
        console.error('Three.js Scene 实例注入失败，请检查注入逻辑');
        return;
    }

    // 1. 创建几何体
    const points = CONFIG.points.map(p => new THREE.Vector3(...p));
    lineGeometry = new THREE.BufferGeometry().setFromPoints(points);

    // 添加线条长度属性
    const lineLengths = calculateLineLengths(CONFIG.points);
    lineGeometry.setAttribute(
        'lineLength',
        new THREE.Float32BufferAttribute(lineLengths, 1)
    );

    // 2. 创建 Shader 材质
    lineMaterial = new THREE.ShaderMaterial({
        uniforms: {
            // 自定义蓝色参数，可以调整RGB值来改变蓝色效果
            lineColor: { value: new THREE.Color(0.1, 0.3, 0.8) },
            // 亮度系数，可调节蓝色深浅
            brightness: { value: 1.2 }
        },
        vertexShader: `

            void main() {
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 lineColor;
            uniform float brightness;
            
            void main() {
                // 应用亮度系数，生成自定义蓝色
                gl_FragColor = vec4(lineColor * brightness, 1.0);
            }
        `,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        // 修复：添加alphaTest避免透明区域锯齿
        alphaTest: 0.01
    });

    // 3. 创建线条对象并添加到场景
    trajectoryLine = new THREE.Line(lineGeometry, lineMaterial);
    scene.value.add(trajectoryLine);
    console.log('轨迹线条创建成功：', trajectoryLine);


};

// 资源清理函数（组件卸载时执行）
const cleanUpResources = () => {

    // 2. 从场景移除线条
    if (scene?.value && trajectoryLine) {
        scene.value.remove(trajectoryLine);
    }

    // 3. 释放几何体资源
    if (lineGeometry) {
        lineGeometry.dispose();
        lineGeometry = null;
    }

    // 4. 释放材质资源
    if (lineMaterial) {
        lineMaterial.dispose();
        lineMaterial = null;
    }

    // 5. 清空引用
    trajectoryLine = null;
    console.log('轨迹线条资源已全部清理');
};

// 生命周期：组件挂载后创建线条（确保inject完成）
onMounted(() => {
    console.log('轨迹线条组件挂载完成');
    createTrajectoryLine();
});

// 生命周期：组件卸载时强制清理资源
onUnmounted(() => {
    cleanUpResources();
});
</script>

<style scoped lang="scss">
.container {}
</style>