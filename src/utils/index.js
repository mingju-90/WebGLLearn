import * as THREE from 'three';

/** 工具函数：字符串颜色转 GLSL 可用的 RGB 数组（值范围 0.0~1.0） */
export const colorStringToRgb = (colorStr) => {
    // 创建 Three.js Color 对象，自动解析各种字符串格式
    const color = new THREE.Color(colorStr);
    // 返回 [r, g, b] 数组（值范围 0.0~1.0）
    return [color.r, color.g, color.b];
};