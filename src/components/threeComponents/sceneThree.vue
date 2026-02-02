<template>
    <div ref="containerRef" style="width: 100%; height: 100%;">
        <!-- 完成初始化, 渲染插槽组件, 通过 provide 注入依赖-->
        <slot v-if="scene"></slot>
    </div>
</template>

<script setup>
import { ref, onMounted, shallowRef, h, onBeforeUnmount, provide } from 'vue'
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const props = defineProps({
    fov: { type: Number, default: 75 },
    near: { type: Number, default: 0.1 },
    far: { type: Number, default: 1000 }
})

const emits = defineEmits(['ready'])

const containerRef = ref()
const scene = shallowRef()
const camera = shallowRef()
const renderer = shallowRef()
const controls = shallowRef()
const ambientLight = shallowRef()


const initScene = () => {
    scene.value = new THREE.Scene()
}

const initCamera = () => {
    const { fov, near, far } = props
    const width = containerRef.value.clientWidth
    const height = containerRef.value.clientHeight
    const aspect = width / height
    camera.value = new THREE.PerspectiveCamera(fov, aspect, near, far)

    camera.value.position.z = 100
    camera.value.position.y = 50
}

const initRenderer = () => {
    const width = containerRef.value.clientWidth
    const height = containerRef.value.clientHeight
    // antialias: true 开启 WebGL 的抗锯齿
    renderer.value = new THREE.WebGLRenderer({ antialias: true })
    renderer.value.setSize(width, height)
    renderer.value.setPixelRatio(window.devicePixelRatio)
}

const initControls = () => {
    controls.value = new OrbitControls(camera.value, renderer.value.domElement)
    containerRef.value.appendChild(renderer.value.domElement)
}

const initAmbientLight = () => {
    ambientLight.value = new THREE.AmbientLight(0xffffff, 0.5)
    scene.value.add(ambientLight.value)
}


/** 监听容器大小并更新相机和渲染器 */
const resizeObserver = () => {
    /** 处理容器大小变化，更新相机和渲染器的大小。 */
    const handleResize = () => {
        if (!containerRef.value) return
        const width = containerRef.value.clientWidth
        const height = containerRef.value.clientHeight
        camera.value.aspect = width / height
        camera.value.updateProjectionMatrix();
        renderer.value.setSize(width, height);
    };


    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(containerRef.value)

    // 组件销毁时, 终止 ResizeObserver 实例的尺寸监听, 停止触发回调函数, 并释放该实例占用的资源
    onBeforeUnmount(() => {
        if (resizeObserver) resizeObserver.disconnect()
    })
}

/** 动画帧 ID */
let animationId = null
/**
 * 定义更新函数的类型：接收场景、相机、渲染器实例，无返回值
 * @callback UpdateFunction
 * @param {THREE.Scene} scene Three.js 场景实例
 * @param {THREE.PerspectiveCamera} camera 透视相机实例
 * @param {THREE.WebGLRenderer} renderer WebGL 渲染器实例
 */

/**
 * 存储所有需要在动画循环中执行的更新函数
 * @type {UpdateFunction[]}
 */
const updateFunctions = [];
const animate = () => {
    animationId = requestAnimationFrame(animate);
    updateFunctions.forEach(func => func(scene.value, camera.value, renderer.value));
    controls.value?.update();
    renderer.value.render(scene.value, camera.value);
}
/**
 * 向动画循环的更新函数列表中添加新的更新函数
 * @param {UpdateFunction} func 要添加的更新函数，需符合 UpdateFunction 类型规范
 */
const addUpdateFunction = (func) => {
    updateFunctions.push(func);
};

/**
 * 从渲染循环中移除一个更新函数
 * @param {UpdateFunction} func 要移除的更新函数。
 */
const removeUpdateFunction = (func) => {
    const index = updateFunctions.indexOf(func);
    if (index !== -1) {
        updateFunctions.splice(index, 1);
    }
};

const destroyThree = () => {
    if (renderer.value && containerRef.value && containerRef.value.contains(renderer.value.domElement)) {
        containerRef.value.removeChild(renderer.value.domElement);
    }
    if (controls.value) {
        controls.value.dispose()
    }
    // 移除环境光
    if (ambientLight.value) {
        scene.value.remove(ambientLight.value)
        ambientLight.value = null // 置空引用，帮助 GC
    }
    scene.value = null;
    camera.value = null;
    renderer.value = null;
    controls.value = null;
    updateFunctions.length = 0;
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
}


provide('scene', scene)
provide('camera', camera)
provide('renderer', renderer)
provide('controls', controls)
provide('addUpdate', addUpdateFunction)
provide('removeUpdate', removeUpdateFunction)

onMounted(() => {
    initScene()
    initCamera()
    initRenderer()
    initControls()
    resizeObserver()
    initAmbientLight()
    animate()
    emits('ready', { scene: scene.value, camera: camera.value, renderer: renderer.value, controls: controls.value })


})

onBeforeUnmount(() => destroyThree())

</script>