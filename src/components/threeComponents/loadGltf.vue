<template>
    <div></div>
</template>

<script setup>
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { shallowRef, inject, ref, onBeforeUnmount } from 'vue'

const props = defineProps({
    value: {
        type: String,
        required: true
    }
})
const emits = defineEmits(['loaded', 'progress'])
// 5. 加载进度回调（透传进度事件）
const progress = (xhr) => {
    if (isDestroyed.value) return
    const percent = (xhr.loaded / xhr.total) * 100
    emits('progress', percent) // 向父组件透传加载进度
}
const scene = inject('scene', null)
const model = shallowRef()
const isLoading = ref(false) // 加载状态，避免重复加载
const isDestroyed = ref(false) // 组件销毁标记
const gltfLoader = shallowRef(null) // 加载器实例（用于取消请求）
// 不能使用ref, 否则会报错 DataCloneError: Failed to execute 'postMessage' on 'Worker': #<Object> could not be cloned.
const dracoLoader = shallowRef(null) // DRACO 加载器实例


const loadGltfModel = async () => {
    // 防重复加载 + 组件销毁/场景不存在时终止
    if (isLoading.value || isDestroyed.value || !scene.value || !props.value) return
    isLoading.value = true

    try {
        // 创建 DRACOLoader 实例
        dracoLoader.value = new DRACOLoader()
        dracoLoader.value.setDecoderPath('/draco/') // 确保路径正确（建议用绝对路径）
        dracoLoader.value.setDecoderConfig({ type: 'js' })

        // 创建 GLTFLoader 实例
        gltfLoader.value = new GLTFLoader()
        gltfLoader.value.setDRACOLoader(dracoLoader.value)

        // 加载模型（修复 this.value 错误 → props.value）
        model.value = await new Promise((resolve, reject) => {
            // 保存加载控制器，用于取消请求
            const loaderController = gltfLoader.value.load(
                props.value,
                resolve,
                progress,
                reject
            )
            // 挂载控制器到加载器实例
            gltfLoader.value.loadController = loaderController


        })
        // 组件未销毁 + 场景存在时，添加模型到场景
        if (!isDestroyed.value && scene.value) {
            scene.value.add(model.value.scene)
            emits('loaded', model.value) // 触发加载完成事件
        }
    } catch (error) {
        // 组件未销毁时触发错误事件
        if (!isDestroyed.value) {
            console.error('GLTF 模型加载失败：', error)
            emits('error', error)
        }
    } finally {
        isLoading.value = false // 重置加载状态
    }

}

// 递归销毁模型资源
const disposeGltfModel = (gltf) => {
    if (!gltf) return
    const disposeObject = (obj) => {
        if (obj.geometry) obj.geometry.dispose()
        if (obj.material) {
            Array.isArray(obj.material) 
                ? obj.material.forEach(mat => mat.dispose()) 
                : obj.material.dispose()
        }
        if (obj.children) obj.children.forEach(disposeObject)
    }
    if (gltf.scene) disposeObject(gltf.scene)
    if (gltf.scenes) gltf.scenes.forEach(disposeObject)
    if (gltf.nodes) Object.values(gltf.nodes).forEach(disposeObject)
    if (gltf.materials) Object.values(gltf.materials).forEach(mat => mat.dispose())
}

// 8. 组件销毁清理逻辑（核心）
const destroy = () => {
    // 标记组件已销毁
    isDestroyed.value = true

    // 1. 取消未完成的加载请求
    if (gltfLoader.value?.loadController) {
        gltfLoader.value.loadController.abort?.() // 新版 Three.js
        gltfLoader.value.loadController.cancel?.() // 旧版 Three.js
    }

    // 2. 销毁 DRACOLoader 解码器（释放 WASM 内存）
    if (dracoLoader.value) {
        dracoLoader.value.dispose?.()
        dracoLoader.value = null
    }

    // 3. 从场景中移除模型
    if (model.value?.scene && scene.value) {
        scene.value.remove(model.value.scene)
    }

    // 4. 销毁模型资源
    disposeGltfModel(model.value)
    model.value = null

    // 5. 清空加载器引用
    gltfLoader.value = null
}

// 9. 生命周期：组件销毁前执行清理
onBeforeUnmount(() => {
    destroy()
})
loadGltfModel()

</script>