<template>
  <div class="container"></div>
</template>

<script setup>
import * as THREE from 'three';
import { ref, reactive, computed, onMounted, inject } from 'vue'
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

// 计算每秒旋转的弧度（一圈2π弧度 / 扫描秒数）
const rotateRadianPerSecond = computed(() => {
    // 避免传入0导致计算错误
    const duration = Math.max(props.scanDuration, 0.1);
    return (2 * Math.PI) / duration;
});

const init = () => {
    if (!scene) {
        console.error('未注入有效的 Three.js Scene 实例');
        return;
    }
    
    // 解析自定义颜色为 RGB 数组（0.0~1.0）
    const customRgb = colorStringToRgb(props.color);
    const { radius } = props;
    
    // 创建和半径匹配的平面
    const geometry = new THREE.PlaneGeometry(radius * 2, radius * 2);
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
    })

    const plane = new THREE.Mesh(geometry, material)
    // -Math.PI/2 是 90 度逆时针旋转，让平面从垂直变水平
    plane.rotation.x = -Math.PI / 2;
    // 可选：调整平面位置（确保在场景中心）
    plane.position.y = 0;
    scene.value.add(plane)

    // 注册动画更新函数
    addUpdate(() => {
        material.uniforms.uTime.value += 0.01;
        // 如果scanDuration动态变化，实时更新旋转速度
        material.uniforms.uRotateRadianPerSecond.value = rotateRadianPerSecond.value;
    })
}

// 组件挂载后初始化（确保inject完成）
onMounted(() => {
    console.log('组件挂载完成，扫描一圈耗时：', props.scanDuration, '秒');
    init();
})
</script>

<style scoped lang="scss">
.container {
  // 样式
}
</style>