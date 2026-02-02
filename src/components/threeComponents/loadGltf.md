## GLTFLoader 组件文档
### 概述
一个基于 Vue 3 和 Three.js 的 GLTF 模型加载组件，支持 Draco 压缩格式，具备完整的资源管理和清理机制。
功能特性
- ✅ 支持 GLTF/GLB 模型加载
- ✅ 集成 Draco 压缩解码
- ✅ 加载进度监控
- ✅ 完整的资源清理机制
- ✅ 防重复加载保护
- ✅ 组件销毁时自动清理
- ✅ 错误处理和事件透传
### 组件 API
Props
| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| value | string | ✅ | - | 模型文件 URL |
Events
| 事件名 | 参数 | 说明 |
|--------|------|------|
| loaded | (gltf: Object) | 模型加载完成时触发 |
| progress | (percent: number) | 加载进度更新时触发 (0-100) |
| error | (error: Error) | 加载失败时触发 |
注入依赖
- scene: Three.js Scene 实例，通过 provide/inject 传入
### 使用示例
1. 基础使用
```js
<template>
  <div>
    <GLTFLoader 
      value="/models/car.glb" 
      @loaded="onModelLoaded"
      @progress="onProgress"
      @error="onError"
    />
  </div>
</template>
<script setup>
import GLTFLoader from './GLTFLoader.vue'
const onModelLoaded = (gltf) => {
  console.log('模型加载完成:', gltf)
  // 可以访问 gltf.scene, gltf.animations 等
}
const onProgress = (percent) => {
  console.log('加载进度:', percent + '%')
}
const onError = (error) => {
  console.error('模型加载失败:', error)
}
</script>
```
2. 在 ThreeScene 组件中使用
```js
<template>
  <ThreeScene @ready="onSceneReady">
    <GLTFLoader value="/models/character.glb" @loaded="onCharacterLoaded" />
  </ThreeScene>
</template>
<script setup>
import ThreeScene from './ThreeScene.vue'
import GLTFLoader from './GLTFLoader.vue'
import { provide } from 'vue'
let scene = null
const onSceneReady = (threeInstance) => {
  scene = threeInstance.scene
  provide('scene', scene)
}
const onCharacterLoaded = (gltf) => {
  // 对加载的模型进行操作
  const model = gltf.scene
  model.position.set(0, 0, 0)
  model.scale.set(1, 1, 1)
}
</script>
```
### 技术实现
1. 核心依赖
```js
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
```
2. Draco 解码器配置
```js
// 不能使用ref, 否则会报错 DataCloneError: Failed to execute 'postMessage' on 'Worker': #<Object> could not be cloned.
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('/draco/')  // 本地路径
// 或使用 CDN
dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.182.0/examples/jsm/libs/draco/')
dracoLoader.setDecoderConfig({ type: 'js' })  // 避免 Worker 问题
```
3. 加载流程
```js
const loadGltfModel = async () => {
  // 1. 状态检查
  if (isLoading.value || isDestroyed.value || !scene.value) return
  
  // 2. 创建加载器
  const dracoLoader = new DRACOLoader()
  const gltfLoader = new GLTFLoader()
  gltfLoader.setDRACOLoader(dracoLoader)
  
  // 3. 加载模型
  const gltf = await gltfLoader.loadAsync(url, onProgress)
  
  // 4. 添加到场景
  scene.value.add(gltf.scene)
  
  // 5. 触发事件
  emits('loaded', gltf)
}
```
4. 资源清理机制
```js
const disposeGltfModel = (gltf) => {
  if (!gltf) return
  
  // 递归释放几何体和材质
  gltf.scene.traverse((child) => {
    if (child.geometry) child.geometry.dispose()
    if (child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach(material => material.dispose())
      } else {
        child.material.dispose()
      }
    }
  })
}
const destroy = () => {
  // 1. 取消加载请求
  if (gltfLoader.value?.loadController) {
    gltfLoader.value.loadController.abort()
  }
  
  // 2. 释放 DRACOLoader
  if (dracoLoader.value) {
    dracoLoader.value.dispose()
  }
  
  // 3. 从场景移除
  if (model.value?.scene && scene.value) {
    scene.value.remove(model.value.scene)
  }
  
  // 4. 释放模型资源
  disposeGltfModel(model.value)
}
```
### 关键知识点
1. Vue 3 响应式选择
- shallowRef: 用于 Three.js 对象，避免深度响应式监听
- ref: 用于基础状态值（loading, destroyed 等）
- inject/inject: 用于跨组件传递 scene 实例
2. Three.js 资源管理
// 几何体释放
geometry.dispose()
// 材质释放
material.dispose()
// 纹理释放
texture.dispose()
// 从场景移除
scene.remove(object)
3. Draco 压缩原理
- Draco 是 Google 开发的 3D 几何压缩库
- 可将模型文件大小减少 90% 以上
- 支持点云和网格数据压缩
- 需要解码器进行实时解压
4. 加载器配置
// JS 解码器（兼容性好）
dracoLoader.setDecoderConfig({ type: 'js' })
// WASM 解码器（性能更好）
dracoLoader.setDecoderConfig({ type: 'wasm' })
注意事项
1. Draco 解码器路径
// ❌ 错误：相对路径在构建后可能失效
dracoLoader.setDecoderPath('./draco/')
// ✅ 正确：绝对路径
dracoLoader.setDecoderPath('/draco/')
// ✅ 推荐：CDN 路径
dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.182.0/examples/jsm/libs/draco/')
2. 内存管理
// ❌ 错误：忘记释放纹理
material.map = texture
// ✅ 正确：及时释放
material.map.dispose()
material.dispose()
3. 异步加载处理
// ❌ 错误：没有状态检查
```js
if (isLoading.value) return  // 可能重复加载
// ✅ 正确：完整的状态检查
if (isLoading.value || isDestroyed.value || !scene.value) return
```
4. 组件生命周期
```js
onBeforeUnmount(() => {
  // 必须在组件销毁前清理资源
  destroy()
})
```
5. 错误处理
```js
try {
  const gltf = await loader.loadAsync(url)
} catch (error) {
  // 区分不同类型的错误
  if (error.target?.status === 404) {
    console.error('文件不存在')
  } else if (error.name === 'DataCloneError') {
    console.error('DRACO Worker 问题')
  }
}
```
### 性能优化建议
1. 模型优化
- 使用 Draco 压缩减少文件大小
- 合并材质减少 draw call
- 优化纹理尺寸（2的幂次）
- 移除不必要的顶点属性
2. 加载优化
```js
// 预加载解码器
dracoLoader.preload()
// 使用 LoadingManager 管理多个模型
const manager = new THREE.LoadingManager()
const loader = new GLTFLoader(manager)
```
3. 内存优化
```js
// 及时释放不再需要的模型
disposeGltfModel(oldGltf)
// 使用对象池复用加载器
const loaderPool = new Map()
```
故障排除
1. DRACOLoader 相关错误
```js
// DataCloneError: Worker 通信问题
dracoLoader.setDecoderConfig({ type: 'js' })
// 解码器路径错误
dracoLoader.setDecoderPath('/draco/')  // 确保文件存在
```
2. 内存泄漏
```js
// 检查是否正确释放
console.log('几何体数量:', scene.value.children.length)
// 强制垃圾回收（开发时）
if (window.gc) window.gc()
```
3. 加载失败
```js
// 检查文件路径
console.log('模型 URL:', props.value)
// 检查 CORS 设置
// 确保服务器支持跨域访问
```
版本兼容性
- Three.js: ^0.182.0
- Vue: ^3.0.0
- Draco: 1.5.6