<template>
    <div></div>
</template>

<script setup>
import * as Cesium from 'cesium';
import { onBeforeUnmount, watch, watchEffect } from 'vue'
const props = defineProps({

    viewer: {
        required: true,
        type: Object
    }
})
const TDT_KEY = '0387f2eabe7fbbe6ba8d86f2c2b2f2b7';



const loadTerrain = async () => {
    // const terrainProvider = new Cesium.CesiumTerrainProvider({
    //     url: `http://t{s}.tianditu.gov.cn/data_terrain/DataServer?T=terrain&x={x}&y={y}&l={z}&tk=${TDT_KEY}`,
    //     subdomains: ["0", "1", "2", "3", "4", "5", "6", "7"],
    //     // requestWaterMask: true, // 请求水掩码（如果有）
    //     requestVertexNormals: true // 请求法线（用于光照效果）
    // });
    // props.viewer.terrainProvider = terrainProvider

    const terrainProvider = await Cesium.ArcGISTiledElevationTerrainProvider.fromUrl('https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer/?f=pjson', {
        requestWaterMask: true,
        requestVertexNormals: true
    });
    props.viewer.terrainProvider = terrainProvider;

    const customShader = new Cesium.CustomShader({
        mode: Cesium.CustomShaderMode.MODIFY_MATERIAL,

        // ✅ 正确的 uniforms 格式：每个变量是 {type: 类型, value: 初始值}
        uniforms: {
            u_time: {
                type: Cesium.UniformType.FLOAT,
                value: 0.0 // 时间初始值
            },
            u_flowSpeed: {
                type: Cesium.UniformType.FLOAT,
                value: 50.0 // 流动速度初始值
            },
            u_flowWidth: {
                type: Cesium.UniformType.FLOAT,
                value: 0.1 // 光效宽度初始值（0~1）
            }
        },

        varyings: {
            v_positionMC: Cesium.VaryingType.VEC3,
            v_positionWC: Cesium.VaryingType.VEC3
        },

        // 顶点着色器（修复变量传递语法）
        vertexShaderText: `
    void vertexMain(VertexInput vsInput, inout VertexOutput vsOutput) {
      // 传递模型坐标
      vsOutput.v_positionMC = vsInput.attributes.positionMC;
      // 正确计算世界坐标（czm_model 是模型矩阵，需转成 vec3）
      vsOutput.v_positionWC = (czm_model * vec4(vsInput.attributes.positionMC, 1.0)).xyz;
    }
  `,

        // 片元着色器（优化光效计算，避免过亮）
        fragmentShaderText: `
    void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
      // 1. 高度渐变颜色（优化范围：适配地形高度）
      float height = fsInput.v_positionWC.y;
      float heightNormalized = clamp((height + 100.0) / 2100.0, 0.0, 1.0);
      vec3 heightColor = mix(
        mix(vec3(1.0, 0.2, 0.2), vec3(0.2, 1.0, 0.2), heightNormalized * 2.0),
        mix(vec3(0.2, 1.0, 0.2), vec3(0.2, 0.2, 1.0), max(heightNormalized * 2.0 - 1.0, 0.0)),
        step(0.5, heightNormalized)
      );

      // 2. 流动光效（优化频率，避免光带过密）
      float flow = fsInput.v_positionWC.x + u_time * u_flowSpeed;
      float wave = sin(flow * 0.005) * 0.5 + 0.5; // 降低频率，光带更宽
      float glow = smoothstep(1.0 - u_flowWidth, 1.0, wave);
      vec3 flowColor = vec3(0.0, 1.0, 1.0) * glow * 0.8;

      // 3. 合并效果（避免颜色溢出）
      material.diffuse = clamp(heightColor + flowColor, 0.0, 1.0);
      material.alpha = 1.0;
      material.emissive = flowColor * 0.5; // 自发光增强光效
    }
  `
    });

    // 3. 给地形添加 CustomShader（也可给3DTiles/Model添加）
    terrainProvider.customShader = customShader;

    props.viewer.clock.onTick.addEventListener(() => {
        const time = performance.now(); // 转换为秒
        console.log('当前时间（秒）:', time);
        customShader.setUniform('u_time', time);
        customShader.setUniform('u_flowSpeed', 50.0); // 流动速度
        customShader.setUniform('u_flowWidth', 0.1); // 光效宽度
    });
}
loadTerrain()


</script>