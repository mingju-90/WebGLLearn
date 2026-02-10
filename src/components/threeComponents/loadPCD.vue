<template>
    <div></div>
</template>

<script setup>
import * as THREE from 'three';
// import { PCDLoader } from 'three/examples/jsm/Addons.js';

import { PCDLoader } from "three/examples/jsm/loaders/PCDLoader.js";
// import { PCDLoader } from 'three/examples/jsm/Addons.js';
import { shallowRef, inject, ref, onBeforeUnmount } from 'vue'
const props = defineProps({
    value: {
        type: String,
        required: true // PCD文件路径
    },
    // 可选：点云渲染配置
    pointSize: {
        type: Number,
        default: 1.0
    },
    pointColor: {
        type: String,
        default: '#ffffff'
    }
})

const emits = defineEmits(['loaded', 'progress', 'error'])

// 加载进度回调（透传进度事件）
const progress = (xhr) => {
    if (isDestroyed.value) return
    const percent = (xhr.loaded / xhr.total) * 100
    emits('progress', percent)
}

const scene = inject('scene', null)
const pointCloud = shallowRef() // 存储点云对象（替换原model）
const isLoading = ref(false)
const isDestroyed = ref(false)
const pcdLoader = shallowRef(null) // PCD加载器实例

const updatePCDSize = () => {
    
}

const loadPCDModel = async () => {
    // 防重复加载 + 组件销毁/场景不存在时终止
    if (isLoading.value || isDestroyed.value || !scene.value || !props.value) return
    isLoading.value = true

    try {
        pcdLoader.value = new PCDLoader()

        // 加载PCD文件
        const pcdData = await new Promise((resolve, reject) => {
            // 保存加载控制器，用于取消请求
            const loaderController = pcdLoader.value.load(
                props.value,
                resolve, // 加载成功回调
                progress, // 进度回调
                reject   // 错误回调
            )
            // 挂载控制器到加载器实例
            pcdLoader.value.loadController = loaderController
        })

        // 组件未销毁 + 场景存在时，处理点云并添加到场景
        if (!isDestroyed.value && scene.value) {
            // ========== 核心：构建点云渲染对象 ==========
            // 1. 创建点云材质（PCDLoader返回的geometry直接使用）
            const material = new THREE.PointsMaterial({
                size: props.pointSize,    // 点的大小
                color: props.pointColor,  // 点的颜色
                sizeAttenuation: true,    // 透视衰减（近大远小）
                transparent: true,       // 开启透明（可选）
                opacity: 1.0              // 不透明度（可选）
            })

            // 2. 创建Points对象（Three.js中点云的渲染载体）
            pointCloud.value = new THREE.Points(pcdData.geometry, material)
            
            // 3. 添加到场景
            scene.value.add(pointCloud.value)
            
            // 触发加载完成事件，返回点云对象
            emits('loaded', pointCloud.value)
        }
    } catch (error) {
        if (!isDestroyed.value) {
            console.error('PCD 点云加载失败：', error)
            emits('error', error)
        }
    } finally {
        isLoading.value = false
    }
}

// 销毁点云资源（适配PCD的资源释放逻辑）
const disposePCDModel = () => {
    if (!pointCloud.value) return
    
    // 1. 释放几何体资源
    if (pointCloud.value.geometry) {
        pointCloud.value.geometry.dispose()
    }
    
    // 2. 释放材质资源
    if (pointCloud.value.material) {
        pointCloud.value.material.dispose()
    }
    
    // 3. 清空点云引用
    pointCloud.value = null
}

// 组件销毁清理逻辑（适配PCD）
const destroy = () => {
    isDestroyed.value = true

    // 1. 取消未完成的加载请求
    if (pcdLoader.value?.loadController) {
        pcdLoader.value.loadController.abort?.()
        pcdLoader.value.loadController.cancel?.()
    }

    // 2. 从场景中移除点云
    if (pointCloud.value && scene.value) {
        scene.value.remove(pointCloud.value)
    }

    // 3. 销毁点云资源
    disposePCDModel()

    // 4. 清空加载器引用
    pcdLoader.value = null
}

// 生命周期：组件销毁前执行清理
onBeforeUnmount(() => {
    destroy()
})

// 启动加载
loadPCDModel()

</script>