<template>
    <div class="container"></div>
</template>

<script setup>
import * as THREE from 'three';
import { ref, reactive, computed, onMounted, shallowRef, inject } from 'vue'
import { colorStringToRgb } from '../../utils';

// Props 定义（radius 明确为最大半径）
const props = defineProps({
    ringCount: {
        type: Number,
        default: 3,
        validator: (value) => value >= 1 && value <= 10
    },
    animationDuration: {
        type: Number,
        default: 3.0,
        validator: (value) => value > 0
    },
    // 自定义颜色（支持 red/#ccc/rgb(255,0,0) 等格式）
    color: {
        type: String,
        default: '#00ff80' // 默认青绿色
    },
    // 明确：圆环扩散的最大半径
    radius: {
        type: Number,
        default: 15, // 扩散的最大尺寸
        validator: (value) => value > 0 // 确保半径为正数
    }
})

// 全局mod函数（仅JS层面使用）
function mod(n, m) {
    return ((n % m) + m) % m;
}

// 注入 Three.js 场景实例
const scene = inject('scene', null);
const addUpdate = inject('addUpdate', () => { })

const group = shallowRef(new THREE.Group())
let scanTime = 0;

// 动画速度计算（适配最大半径，保证时长一致）
const getAnimationSpeed = () => {
    const baseSpeed = 0.003;
    const baseDuration = 3.0;
    return (baseSpeed * baseDuration) / props.animationDuration;
};

const init = () => {
    if (!scene.value) {
        console.error('未注入有效的Three.js Scene实例');
        return;
    }

    // 解析自定义颜色为 RGB 数组（0.0~1.0）
    const customRgb = colorStringToRgb(props.color);
    const baseDelay = props.animationDuration / props.ringCount;

    for (let i = 0; i < props.ringCount; i++) {
        // 核心修改1：几何尺寸固定为基础值（1），最大半径由缩放控制
        const geometry = new THREE.RingGeometry(0.01, 1, 64); // 固定小尺寸
        const material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uDelay: { value: baseDelay * i },
                uCustomColor: { value: new THREE.Vector3(...customRgb) },
                // 传入最大半径到着色器
                uMaxRadius: { value: props.radius }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float uTime;
                uniform float uDelay;
                uniform vec3 uCustomColor;
                uniform float uMaxRadius;
                varying vec2 vUv;
                
                void main() {
                    float time = uTime - uDelay;
                    // 基于动画时长计算进度（0~1）
                    float progress = mod(time * 1.5, ${props.animationDuration}.0) / ${props.animationDuration}.0;
                    // 透明度：从1到0渐变（扩散越远越透明）
                    float alpha = 1.0 - smoothstep(0.0, 1.0, progress);
                    
                    // UV基于中心计算，保持渐变效果一致（不受半径影响）
                    alpha *= (1.0 - length(vUv - 0.5));
                    
                    vec3 color = uCustomColor;
                    gl_FragColor = vec4(color, alpha * 0.8);
                }
            `,
            transparent: true,
            depthWrite: false
        });
        const ring = new THREE.Mesh(geometry, material);
        group.value.add(ring);
    }

    group.value.rotation.x = -Math.PI / 2;
    group.value.position.y = 0.1;
    scene.value.add(group.value);

    addUpdate(() => {
        const speed = getAnimationSpeed();
        scanTime += speed;
        
        group.value.children.forEach((child, i) => {
            child.material.uniforms.uTime.value = scanTime;
            const time = scanTime - child.material.uniforms.uDelay.value;
            // 计算动画进度（0~1）
            const progress = mod(time * 1.5, props.animationDuration) / props.animationDuration;
            // 核心修改2：缩放以radius为最大半径（progress=1时，缩放至radius）
            const currentScale = progress * props.radius;
            child.scale.setScalar(currentScale);
        });
    });
};

onMounted(() => {
    console.log('组件挂载完成：', {
        color: colorStringToRgb(props.color),
        maxRadius: props.radius, // 明确标注为最大半径
        ringCount: props.ringCount,
        duration: props.animationDuration
    });
    init();
});
</script>

<style scoped lang="scss">
.container {
    // 样式
}
</style>