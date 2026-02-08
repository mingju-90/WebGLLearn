import * as THREE from 'three';

// 辐射配置（可自定义）
const RADIATION_CONFIG = {
    maxRadius: 8,   // 辐射最大半径
    ringCount: 4,   // 辐射环数量（越多效果越密集）
    speed: 0.015,   // 辐射扩散速度（越小越慢）
    baseColor: new THREE.Color(0x00ff99),   // 辐射基础颜色
    blendColor: new THREE.Color(0x0066ff)   // 辐射叠加颜色
}

export const createRadiationShaderMaterial = () => {
    return new THREE.ShaderMaterial({
        // 统一变量: 向着色器传递动态参数
        uniforms: {
            uMaxRadius: { value: RADIATION_CONFIG.maxRadius },
            uProgress: { value: 0 },
            uBaseColor: { value: RADIATION_CONFIG.baseColor },
            uBlendColor: { value: RADIATION_CONFIG.blendColor },
            uOpacity: { value: 1 },
            // 新增：传递画布尺寸，解决辐射中心偏移问题
            uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
        },
        // 修复后的顶点着色器（删除重复定义+修正语法）
        vertexShader: `
            // 无需声明position/modelViewMatrix/projectionMatrix（Three.js内置）
            void main() {
                // 将顶点转换为裁剪空间坐标（保留核心逻辑）
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        // 优化后的片元着色器（修复中心偏移）
        fragmentShader: `
            // 统一变量 (与 JS 对应)
            uniform float uMaxRadius;
            uniform float uProgress;
            uniform vec3 uBaseColor;
            uniform vec3 uBlendColor;
            uniform float uOpacity;
            uniform vec2 uResolution; // 画布尺寸

            void main() {
                // 1. 计算当前像素到画布中心的距离（归一化到0-1）
                // 修复：基于画布尺寸计算中心，避免偏移
                vec2 center = uResolution / 2.0; // 真实画布中心
                float dist = length(gl_FragCoord.xy - center) / uMaxRadius;
                // 限制dist最大值，避免超出辐射范围的像素显示异常
                dist = clamp(dist, 0.0, 1.0);
                

                // 2. 计算辐射衰减：进度越大，衰减越明显（smoothstep实现平滑过渡）
                float decay = smoothstep(0.0, 1.0, dist * (1.0 + uProgress));
                decay = clamp(decay, 0.0, 1.0);

                // float decay = smoothstep(uProgress, uProgress - 0.1, dist);
                // decay = clamp(decay, 0.0, 1.0);

                // 3. 混合颜色：基础色 + 叠加色 × 衰减（实现渐变）
                vec3 finalColor = mix(uBaseColor, uBlendColor, decay);
                
                // 4. 计算最终透明度：随进度衰减，且距离越远越透明
                float finalAlpha = (1.0 - decay) * (1.0 - uProgress) * uOpacity;
                finalAlpha = clamp(finalAlpha, 0.0, 1.0); // 限制透明度
                
                // 5. 输出像素颜色（RGBA）
                gl_FragColor = vec4(finalColor, finalAlpha);
            }
        `,
        // 关键配置：开启透明+叠加混合
        transparent: true, // 必须开启，否则透明度不生效
        blending: THREE.AdditiveBlending, // 叠加混合，辐射环叠加处更亮
        depthWrite: false, // 关闭深度写入，避免辐射环遮挡自身
        // 新增：关闭深度测试（可选，进一步避免透明层级问题）
        depthTest: false
    })
}