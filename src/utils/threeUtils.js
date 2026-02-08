import * as THREE from 'three';


/**
 * @description 设置 GLTF 模型的缩放，使其适应指定的尺寸（米）。
 * @param {THREE.Group} model - GLTF 模型的场景对象（gltf.scene）。
 * @param {number} size - 目标尺寸（米），模型将被缩放到此大小。
 */
export const setModelScale = (model, size) => {
    // 确保模型的矩阵已更新
    model.updateMatrixWorld(true)
    // 计算模型的边界框
    const box = new THREE.Box3().setFromObject(model)
    // 获取边界框的大小向量
    const sizeVector = box.getSize(new THREE.Vector3())
    // 计算当前模型的对角线长度作为当前大小
    const currentSize = Math.sqrt(sizeVector.x ** 2 + sizeVector.y ** 2 + sizeVector.z ** 2)
    // 避免除零错误
    if (currentSize === 0) {
        console.warn('模型大小为零，无法缩放')
        return
    }
    // 计算缩放比例
    const scale = size / currentSize
    console.log(`当前大小: ${currentSize}, 目标大小: ${size}, 缩放比例: ${scale}`)
    // 应用均匀缩放
    model.scale.set(scale, scale, scale)
    // 再次更新矩阵以应用缩放
    model.updateMatrixWorld(true)
}