<template>
    <!-- 空模板，逻辑在script中处理 -->
</template>

<script setup>
import * as Cesium from 'cesium';

// 定义组件Props
const props = defineProps({
    // Cesium Viewer实例（必传）
    viewer: {
        type: Object,
        required: true,
        validator: (val) => val instanceof Cesium.Viewer
    },
});






const createPolygonPrimitive1 = () => {
    // ✅ 1. 使用 FLOAT32ARRAY 和 FLOAT 类型保持一致
    const positions = new Float32Array([
        0, 0, 0,
        7500, 0, 0,
        0, 7500, 0,
        7500, 7500, 0,
        
        0, 0, 7500,
        7500, 0, 7500,
        0, 7500, 7500,
        7500, 7500, 7500,

        0, 0, 0,
        0, 7500, 0,
        0, 7500, 7500,
        0, 0, 7500,
    ]);

    const indices = new Uint16Array([
        0, 1, 2, 
        1, 2, 3,

        0, 1, 4, 
        // 0, 2, 4,
        8, 9, 10,
        8, 10, 11,
        
        1, 4, 5, 1, 3, 5,
        
        // 4, 6, 2, 
        2, 3, 6,
        
        4, 5, 6, 5, 6, 7,
        
        6, 7, 3, 5, 7, 3
    ]);
    const vertexFormat = Cesium.MaterialAppearance.VERTEX_FORMAT;
 
    // ✅ 3. 使用一致的类型和格式
    const geometry = new Cesium.Geometry({
        attributes: {
            position: new Cesium.GeometryAttribute({
                componentDatatype: Cesium.ComponentDatatype.DOUBLE, // ✅ FLOAT
                componentsPerAttribute: 3,
                values: positions // ✅ 对应 Float32Array
            }),
            st: new Cesium.GeometryAttribute({
                componentDatatype: Cesium.ComponentDatatype.FLOAT, // ✅ FLOAT
                componentsPerAttribute: 2,
                // 定义顶点的纹理坐标 每个顶点对应一个纹理坐标 (s, t)
                values: new Float32Array([
                    0, 0,
                    1, 0,
                    0, 1,
                    1, 1,
                    0, 0,
                    1, 0, 
                    0, 1,
                    1, 1,
                    1, 0,
                    0, 0,
                    0, 1,
                    1, 1,
                    
                ])
            })
        
        },
        indices: indices,
        primitiveType: Cesium.PrimitiveType.TRIANGLES,
        boundingSphere: Cesium.BoundingSphere.fromVertices(positions),
        vertexFormat: Cesium.VertexFormat.POSITION_AND_ST // ✅ 包含法线属性
    });

    const instance = new Cesium.GeometryInstance({
        geometry,
        modelMatrix: Cesium.Transforms.eastNorthUpToFixedFrame(
            Cesium.Cartesian3.fromDegrees(116, 40, 7000)
        ),
       

    });

    const primitive = new Cesium.Primitive({
        geometryInstances: instance,
        appearance: new Cesium.MaterialAppearance({
          
            material: Cesium.Material.fromType('Image', {
                image: '/123.png',
            }),
            faceForward: true,
            translucent: false,
            vertexFormat: Cesium.VertexFormat.POSITION_AND_ST
            // vertexFormat
        }),
        asynchronous: false
    });

    props.viewer.scene.primitives.add(primitive);
    props.viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(116, 40, 27000), // 100万矩形需5000米高度
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-80), // 更陡的俯视角度，看清边框
      roll: 0
    },
    duration: 3,
    complete: () => {
      console.log('定位完成！');
    },
    cancel: () => {
      console.log('定位取消！');
    }
  });
};
setTimeout(() => {
    createPolygonPrimitive1();
}, 1000);
// createPolygonPrimitive1();

</script>