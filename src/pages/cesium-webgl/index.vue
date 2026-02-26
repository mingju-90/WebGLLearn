<template>
  <div class="cesium-webgl-container">
    <ViewerVue @ready="ready">
      <template v-slot="{ viewer }">
        <TiandituLayer :viewer="viewer" type="img" />
        <!-- <TiandituLayer :viewer="viewer" type="cia" /> -->
        <ArcTerrain :viewer="viewer" />
        <PolygonPrimitive :viewer="viewer" />
      </template>
    </ViewerVue>
  </div>
</template>

<script setup>
// 页面逻辑
import * as Cesium from 'cesium';
import { onMounted, shallowRef } from 'vue';
import ViewerVue from '../../components/cesiumComponents/viewer.vue';


import TiandituLayer from '../../components/cesiumComponents/tiandituLayer.vue';
import PolygonPrimitive from './PolygonPrimitive.vue';
import ArcTerrain from '../../components/cesiumComponents/ArcTerrain.vue';
// import aaaimg from '../../assets/cesium/aaa.png'

const viewer = shallowRef(null)


const ready = (_viewer) => {
  return
  viewer.value = _viewer
  for(let i = 0; i < 100; i++) {
    addBox2([116, 39.05 + i * 0.005]) // 生成经纬度坐标，验证位置正确
  }
  viewer.value.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(116.0, 39.05, 5000), // 100万矩形需5000米高度
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
  // addBox3()
}

/** 通过entity box 添加 */
const addBox1 = () => {
  const box = viewer.value.entities.add({
    name: 'box1',
    position: Cesium.Cartesian3.fromDegrees(116.0, 40.0, 0),
    box: {
      dimensions: new Cesium.Cartesian3(100.0, 100.0, 100.0),
      material: Cesium.Color.RED,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
    },
  });
  viewer.value.zoomTo(box);
}
/**
 * 生成n个阵列的矩形顶点和索引数据
 * @param {number} n - 阵列数量（必须≥1）
 * @returns {Object} { positions: Float64Array, indices: Uint16Array }
 */

const addBox2 = ([lng, lat]) => {
  console.time('generateGridRectangles')
  // 注意：10000个阵列=100万矩形，建议先测试10个阵列验证效果
  // const {positions, indices, st} = generateGridRectangles(10000) // 先测10个阵列，再改回10000
  const arr = generateRectangleCoordinates(1, [lng, lat]) // 生成经纬度坐标，验证位置正确
  console.log('生成的经纬度坐标示例：', arr[0]); // 打印第一个矩形的4个角点坐标
  const {positions, indices, st, center} = convertRectanglesToRenderData(arr) // 转换为渲染数据，验证格式正确
  console.log('生成的顶点数据示例：', center); // 打印前4个顶点坐标（每个顶点3个值）
  console.log('生成的索引数据示例：', positions.slice(0, 6)); // 打印前6个索引（组成第一个矩形的两个三角形）
  // return
  console.timeEnd('generateGridRectangles')



  // 2. 构建几何（新增ST纹理坐标属性，用于边框计算）
  const geometry = new Cesium.Geometry({
    attributes: {
      position: new Cesium.GeometryAttribute({
        componentDatatype: Cesium.ComponentDatatype.DOUBLE,
        componentsPerAttribute: 3,
        values: positions
      }),
      st: new Cesium.GeometryAttribute({ // 新增ST属性
        componentDatatype: Cesium.ComponentDatatype.FLOAT,
        componentsPerAttribute: 2,
        values: st
      })
    },
    indices,
    primitiveType: Cesium.PrimitiveType.TRIANGLES,
    boundingSphere: Cesium.BoundingSphere.fromVertices(positions),
  });
  console.log('创建的 Geometry:', geometry);

  // 3. 构建几何实例（移除color属性，改用材质统一控制颜色）
  const geometryInstance = new Cesium.GeometryInstance({
    geometry: geometry,
    modelMatrix: Cesium.Transforms.eastNorthUpToFixedFrame(
      Cesium.Cartesian3.fromDegrees(lng, lat, 100)
    )
  });

  // 4. 自定义材质：蓝色边框 + 浅蓝色填充（核心）
  const borderMaterial = new Cesium.Material({
    fabric: {
      // 材质参数（可按需调整）
      type: 'Image',
      uniforms: {
        image: '/123.png',
      }, 
     
    },
  });

  // 5. 构建Primitive（改用MaterialAppearance支持自定义材质）
  const primitive = new Cesium.Primitive({
    geometryInstances: geometryInstance,
    appearance: new Cesium.MaterialAppearance({
      material: borderMaterial,
      flat: true, // 关闭光照，保留纯色效果
      translucent: false,
      closed: false // 非闭合几何体，减少计算
    }),
    asynchronous: false, // 海量数据建议先关闭异步
    compressVertices: true // 压缩顶点，减少内存占用
  });

  // 6. 添加到场景（加错误捕获，避免崩溃）
  try {
    viewer.value.scene.primitives.add(primitive);
    console.log('Primitive添加成功！');
  } catch (e) {
    console.error('添加Primitive失败：', e);
  }

  // 7. 视角定位（适配100万矩形，提高高度）
  
}

function generateGridRectangles(n) {
  const config = {
    rect: { length: 50, width: 30, gap: 15 },
    array: { rowCount: 10, colCount: 10, gap: 30, maxPerRow: 10 }
  };

  if (n < 1) throw new Error('阵列数量n必须≥1');

  // 预计算总顶点数（性能优化）
  const totalRects = n * config.array.rowCount * config.array.colCount;
  const totalVertices = totalRects * 4;
  const totalIndices = totalRects * 6;

  // ========== 添加打印语句 ==========
  console.log(`[generateGridRectangles] 一共生成了 ${totalRects} 个矩形`);
  console.log(`  - 阵列数量: ${n}`);
  console.log(`  - 每个阵列矩形数: ${config.array.rowCount * config.array.colCount}`);
  console.log(`  - 总顶点数: ${totalVertices}`);
  console.log(`  - 总索引数: ${totalIndices}`);
  // ================================

  // 预分配数组
  const positionsArr = new Array(totalVertices * 3);
  const indicesArr = new Array(totalIndices);
  const stArr = new Array(totalVertices * 2); // 新增ST数组

  // 单个阵列尺寸
  const arrayWidth = (config.rect.length + config.rect.gap) * config.array.colCount - config.rect.gap;
  const arrayHeight = (config.rect.width + config.rect.gap) * config.array.rowCount - config.rect.gap;

  let vertexIdx = 0;
  let indexIdx = 0;
  let stIdx = 0;

  for (let arrayIdx = 0; arrayIdx < n; arrayIdx++) {
    const arrayRow = Math.floor(arrayIdx / config.array.maxPerRow);
    const arrayCol = arrayIdx % config.array.maxPerRow;
    const arrayOffsetX = arrayCol * (arrayWidth + config.array.gap);
    const arrayOffsetY = arrayRow * (arrayHeight + config.array.gap);

    for (let rectRow = 0; rectRow < config.array.rowCount; rectRow++) {
      for (let rectCol = 0; rectCol < config.array.colCount; rectCol++) {
        const rectOffsetX = rectCol * (config.rect.length + config.rect.gap);
        const rectOffsetY = rectRow * (config.rect.width + config.rect.gap);

        // 矩形顶点坐标
        const x1 = arrayOffsetX + rectOffsetX;
        const y1 = arrayOffsetY + rectOffsetY;
        const x2 = x1 + config.rect.length;
        const y2 = y1 + config.rect.width;
        const z = 0;

        // 填充顶点坐标
        positionsArr[vertexIdx * 3] = x1;
        positionsArr[vertexIdx * 3 + 1] = y1;
        positionsArr[vertexIdx * 3 + 2] = z;

        positionsArr[(vertexIdx + 1) * 3] = x2;
        positionsArr[(vertexIdx + 1) * 3 + 1] = y1;
        positionsArr[(vertexIdx + 1) * 3 + 2] = z;

        positionsArr[(vertexIdx + 2) * 3] = x2;
        positionsArr[(vertexIdx + 2) * 3 + 1] = y2;
        positionsArr[(vertexIdx + 2) * 3 + 2] = z;

        positionsArr[(vertexIdx + 3) * 3] = x1;
        positionsArr[(vertexIdx + 3) * 3 + 1] = y2;
        positionsArr[(vertexIdx + 3) * 3 + 2] = z;

        // 填充ST纹理坐标（每个矩形独立0~1范围，用于计算边框）
        stArr[stIdx * 2] = 0.0;
        stArr[stIdx * 2 + 1] = 0.0;

        stArr[(stIdx + 1) * 2] = 1.0;
        stArr[(stIdx + 1) * 2 + 1] = 0.0;

        stArr[(stIdx + 2) * 2] = 1.0;
        stArr[(stIdx + 2) * 2 + 1] = 1.0;

        stArr[(stIdx + 3) * 2] = 0.0;
        stArr[(stIdx + 3) * 2 + 1] = 1.0;

        // 填充索引
        indicesArr[indexIdx] = vertexIdx;
        indicesArr[indexIdx + 1] = vertexIdx + 1;
        indicesArr[indexIdx + 2] = vertexIdx + 2;

        indicesArr[indexIdx + 3] = vertexIdx;
        indicesArr[indexIdx + 4] = vertexIdx + 2;
        indicesArr[indexIdx + 5] = vertexIdx + 3;

        // 更新索引
        vertexIdx += 4;
        indexIdx += 6;
        stIdx += 4;
      }
    }
  }

  return {
    positions: new Float64Array(positionsArr),
    indices: new Uint16Array(indicesArr),
    st: new Float32Array(stArr) // 返回ST坐标
  };
}
function convertRectanglesToRenderData(rectangles) {
  const totalRects = rectangles.length;
  
  if (totalRects === 0) {
    throw new Error('rectangles 数组不能为空');
  }

  // ========== 计算所有矩形的中心点（所有角点的平均值） ==========
  let sumLng = 0, sumLat = 0;
  let totalCorners = 0;
  
  for (let rectIdx = 0; rectIdx < totalRects; rectIdx++) {
    const corners = rectangles[rectIdx];
    for (let cornerIdx = 0; cornerIdx < 4; cornerIdx++) {
      sumLng += corners[cornerIdx][0];
      sumLat += corners[cornerIdx][1];
      totalCorners++;
    }
  }
  
  const centerLng = sumLng / totalCorners;
  const centerLat = sumLat / totalCorners;
  
  // ========== 经纬度转米的辅助函数（改进版） ==========
  function degreesToMeters(lng, lat, refLng, refLat) {
    const earthRadius = 6378137;  // WGS84椭球体赤道半径（米）
    const lngDiff = lng - refLng;
    const latDiff = lat - refLat;
    
    // 纬度转米（使用平均纬度提高精度）
    const avgLat = (lat + refLat) / 2;
    const metersY = latDiff * earthRadius * (Math.PI / 180);
    
    // 经度转米（使用平均纬度计算余弦值，提高精度）
    const metersX = lngDiff * earthRadius * Math.cos(avgLat * Math.PI / 180) * (Math.PI / 180);
    
    return [metersX, metersY];
  }

  const totalVertices = totalRects * 4;
  const totalIndices = totalRects * 6;

  // ========== 打印统计信息 ==========
  // ================================

  // 预分配数组
  const positionsArr = new Array(totalVertices * 3);
  const indicesArr = new Array(totalIndices);
  const stArr = new Array(totalVertices * 2);

  let vertexIdx = 0;
  let indexIdx = 0;
  let stIdx = 0;

  for (let rectIdx = 0; rectIdx < totalRects; rectIdx++) {
    const corners = rectangles[rectIdx];

    // 填充顶点坐标（米单位，相对于中心点）
    for (let cornerIdx = 0; cornerIdx < 4; cornerIdx++) {
      const [lng, lat] = corners[cornerIdx];
      
      // 转换为相对于中心点的米单位坐标
      const [metersX, metersY] = degreesToMeters(lng, lat, centerLng, centerLat);
      
      positionsArr[vertexIdx * 3] = metersX;      // X (东方向，米)
      positionsArr[vertexIdx * 3 + 1] = metersY;  // Y (北方向，米)
      positionsArr[vertexIdx * 3 + 2] = 0;        // Z (高度，米)

      // 填充ST纹理坐标（每个矩形独立0~1范围）
      stArr[stIdx * 2] = cornerIdx === 0 || cornerIdx === 3 ? 0.0 : 1.0;
      stArr[stIdx * 2 + 1] = cornerIdx === 0 || cornerIdx === 1 ? 0.0 : 1.0;

      vertexIdx++;
      stIdx++;
    }

    // 填充索引（两个三角形组成矩形）
    const baseIdx = rectIdx * 4;
    indicesArr[indexIdx] = baseIdx;
    indicesArr[indexIdx + 1] = baseIdx + 1;
    indicesArr[indexIdx + 2] = baseIdx + 2;
    indicesArr[indexIdx + 3] = baseIdx;
    indicesArr[indexIdx + 4] = baseIdx + 2;
    indicesArr[indexIdx + 5] = baseIdx + 3;

    indexIdx += 6;
  }

  return {
    positions: new Float64Array(positionsArr),
    indices: new Uint16Array(indicesArr),
    st: new Float32Array(stArr),
    center: [centerLng, centerLat]
  };
}
function generateRectangleCoordinates(n, center) {
  const [centerLng, centerLat] = center;
  
  const config = {
    rect: { length: 50, width: 30, gap: 15 },      // 矩形尺寸和间距（米）
    array: { rowCount: 10, colCount: 10, gap: 40, maxPerRow: 100 }  // 阵列配置
  };

  if (n < 1) throw new Error('阵列数量n必须≥1');

  // 米转经纬度的辅助函数
  function metersToDegrees(meters, latitude, isLongitude = false) {
    const earthRadius = 6378137; // WGS84椭球体赤道半径（米）
    if (isLongitude) {
      return (meters / (earthRadius * Math.cos(Cesium.Math.toRadians(latitude)))) * 
             Cesium.Math.toDegrees(1);
    } else {
      return (meters / earthRadius) * Cesium.Math.toDegrees(1);
    }
  }

  // 计算总矩形数
  const totalRects = n * config.array.rowCount * config.array.colCount;
  
  // ========== 打印统计信息 ==========
  // ================================

  // 单个阵列尺寸（米）
  const arrayWidth = (config.rect.length + config.rect.gap) * config.array.colCount - config.rect.gap;
  const arrayHeight = (config.rect.width + config.rect.gap) * config.array.rowCount - config.rect.gap;

  // 计算整体偏移，使网格以中心点居中
  const totalCols = Math.min(n, config.array.maxPerRow);
  const totalRows = Math.ceil(n / config.array.maxPerRow);
  const totalWidth = totalCols * arrayWidth + (totalCols - 1) * config.array.gap;
  const totalHeight = totalRows * arrayHeight + (totalRows - 1) * config.array.gap;
  const centerXOffset = -totalWidth / 2 + arrayWidth / 2;
  const centerYOffset = -totalHeight / 2 + arrayHeight / 2;

  const allRectangles = [];

  for (let arrayIdx = 0; arrayIdx < n; arrayIdx++) {
    const arrayRow = Math.floor(arrayIdx / config.array.maxPerRow);
    const arrayCol = arrayIdx % config.array.maxPerRow;
    
    // 阵列中心偏移（米）
    const arrayOffsetX = centerXOffset + arrayCol * (arrayWidth + config.array.gap);
    const arrayOffsetY = centerYOffset + arrayRow * (arrayHeight + config.array.gap);

    // 转换为经纬度偏移
    const arrayOffsetLng = metersToDegrees(arrayOffsetX, centerLat, true);
    const arrayOffsetLat = metersToDegrees(arrayOffsetY, centerLat, false);
    
    const arrayCenterLng = centerLng + arrayOffsetLng;
    const arrayCenterLat = centerLat + arrayOffsetLat;

    for (let rectRow = 0; rectRow < config.array.rowCount; rectRow++) {
      for (let rectCol = 0; rectCol < config.array.colCount; rectCol++) {
        // 矩形在阵列中的偏移（米）
        const rectOffsetX = (rectCol - config.array.colCount / 2 + 0.5) * (config.rect.length + config.rect.gap);
        const rectOffsetY = (rectRow - config.array.rowCount / 2 + 0.5) * (config.rect.width + config.rect.gap);

        // 转换为经纬度偏移
        const rectOffsetLng = metersToDegrees(rectOffsetX, arrayCenterLat, true);
        const rectOffsetLat = metersToDegrees(rectOffsetY, arrayCenterLat, false);

        const rectCenterLng = arrayCenterLng + rectOffsetLng;
        const rectCenterLat = arrayCenterLat + rectOffsetLat;

        // 计算矩形4个角点的经纬度偏移（半长半宽）
        const halfLengthLng = metersToDegrees(config.rect.length / 2, rectCenterLat, true);
        const halfWidthLat = metersToDegrees(config.rect.width / 2, rectCenterLat, false);

        // 4个角点：左下、右下、右上、左上（逆时针）
        const corners = [
          [rectCenterLng - halfLengthLng, rectCenterLat - halfWidthLat],  // 左下
          [rectCenterLng + halfLengthLng, rectCenterLat - halfWidthLat],  // 右下
          [rectCenterLng + halfLengthLng, rectCenterLat + halfWidthLat],  // 右上
          [rectCenterLng - halfLengthLng, rectCenterLat + halfWidthLat]   // 左上
        ];

        allRectangles.push(corners);
      }
    }
  }
  return allRectangles;
}



/**
 * addBox3：极简版 - 经纬度加载四边形 + 纯色材质
 * 核心：1个Primitive + 多GeometryInstance（每个矩形1个）
 */
const addBox3 = () => {
  addRectangleGridPrimitive(viewer.value, [116.391, 39.904], 100000) // 100个阵列=10万矩形，性能可接受

  viewer.value.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(116.391, 39.904, 5000), // 100万矩形需5000米高度
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

/**
 * 在Cesium中添加四边形矩阵图元
 * @param {Cesium.Viewer} viewer - Cesium viewer对象
 * @param {Array} center - 中心点坐标 [lng, lat]
 * @param {Number} n - 阵列总数量
 * @returns {Cesium.Primitive} 创建的图元对象
 */
function addRectangleGridPrimitive(viewer, center, n) {
  const [centerLng, centerLat] = center;
  
  // 配置参数
  const config = {
    rectLength: 50,        // 四边形长度（米）- 东西方向
    rectWidth: 30,         // 四边形宽度（米）- 南北方向
    rectGap: 15,           // 四边形之间间隔（米）
    matrixGap: 30,         // 阵列之间间隔（米）
    maxCols: 10,           // 每行最多10个阵列
    rectsPerMatrix: 10     // 每个阵列中的四边形数量（每行）
  };
  
  // 根据n计算行数和列数
  const matrixCols = Math.min(n, config.maxCols);  // 列数（不超过10）
  const matrixRows = Math.ceil(n / config.maxCols); // 行数
  
  // 米转经纬度的辅助函数
  function metersToDegrees(meters, latitude, isLongitude = false) {
    const earthRadius = 6378137; // WGS84椭球体赤道半径（米）
    if (isLongitude) {
      // 经度转换需要考虑纬度
      return (meters / (earthRadius * Math.cos(Cesium.Math.toRadians(latitude)))) * 
             Cesium.Math.toDegrees(1);
    } else {
      // 纬度转换
      return (meters / earthRadius) * Cesium.Math.toDegrees(1);
    }
  }
  
  // 计算矩形边界（给定中心点和长宽）
  function getRectangleBounds(centerLng, centerLat, lengthMeters, widthMeters) {
    const halfLength = lengthMeters / 2;
    const halfWidth = widthMeters / 2;
    
    const lngOffset = metersToDegrees(halfLength, centerLat, true);
    const latOffset = metersToDegrees(halfWidth, centerLat, false);
    
    return {
      west: centerLng - lngOffset,
      east: centerLng + lngOffset,
      south: centerLat - latOffset,
      north: centerLat + latOffset
    };
  }
  
  // 存储所有geometryInstances
  const geometryInstances = [];
  
  // 计算单个阵列的总尺寸（用于阵列间偏移）
  // 每个阵列内10个四边形，每个50米长，间隔15米
  const singleMatrixLength = config.rectLength * config.rectsPerMatrix + 
                            config.rectGap * (config.rectsPerMatrix - 1);
  const singleMatrixWidth = config.rectWidth;
  
  // 计算总行数和实际列数（最后一行可能不足10个）
  const totalRows = matrixRows;
  
  // 遍历阵列矩阵
  for (let matrixRow = 0; matrixRow < totalRows; matrixRow++) {
    // 计算当前行的实际列数（最后一行可能不足10个）
    const currentRowCols = (matrixRow === totalRows - 1) ? 
                          (n % config.maxCols || config.maxCols) : 
                          config.maxCols;
    
    for (let matrixCol = 0; matrixCol < currentRowCols; matrixCol++) {
      // 计算当前阵列的索引
      const matrixIndex = matrixRow * config.maxCols + matrixCol;
      
      // 如果超过n，跳过
      if (matrixIndex >= n) break;
      
      // 计算当前阵列的中心点偏移（以整体中心为基准）
      // 先计算总宽度和总高度，用于居中
      const totalWidth = (matrixCols - 1) * (singleMatrixLength + config.matrixGap) + singleMatrixLength;
      const totalHeight = (totalRows - 1) * (singleMatrixWidth + config.matrixGap) + singleMatrixWidth;
      
      const matrixOffsetX = matrixCol * (singleMatrixLength + config.matrixGap) - totalWidth / 2 + singleMatrixLength / 2;
      const matrixOffsetY = matrixRow * (singleMatrixWidth + config.matrixGap) - totalHeight / 2 + singleMatrixWidth / 2;
      
      const matrixOffsetLng = metersToDegrees(matrixOffsetX, centerLat, true);
      const matrixOffsetLat = metersToDegrees(matrixOffsetY, centerLat, false);
      
      const matrixCenterLng = centerLng + matrixOffsetLng;
      const matrixCenterLat = centerLat + matrixOffsetLat;
      
      // 在每个阵列中创建四边形（一行10个）
      for (let rectIndex = 0; rectIndex < config.rectsPerMatrix; rectIndex++) {
        // 计算当前四边形在阵列中的偏移
        const rectOffsetX = (rectIndex - config.rectsPerMatrix / 2 + 0.5) * (config.rectLength + config.rectGap);
        
        const rectOffsetLng = metersToDegrees(rectOffsetX, matrixCenterLat, true);
        const rectCenterLng = matrixCenterLng + rectOffsetLng;
        const rectCenterLat = matrixCenterLat;
        
        // 获取矩形边界
        const bounds = getRectangleBounds(rectCenterLng, rectCenterLat, config.rectLength, config.rectWidth);
        
        // 创建RectangleGeometry
        const rectangleGeometry = new Cesium.RectangleGeometry({
          rectangle: Cesium.Rectangle.fromDegrees(
            bounds.west,
            bounds.south,
            bounds.east,
            bounds.north
          ),
          height: 0,  // 贴地高度
          extrudedHeight: 0
        });
        
        // 创建GeometryInstance，使用id区分每个实例
        const geometryInstance = new Cesium.GeometryInstance({
          geometry: rectangleGeometry,
          id: `matrix_${matrixIndex}_rect_${rectIndex}`,
          attributes: {
            color: Cesium.ColorGeometryInstanceAttribute.fromColor(
              new Cesium.Color(
                0.2,  // R
                0.6,  // G
                0.9,  // B
                0.8   // Alpha透明度
              )
            )
          }
        });
        
        geometryInstances.push(geometryInstance);
      }
    }
  }
  
  console.log(`生成了 ${geometryInstances.length} 个GeometryInstance（共${n}个阵列，每阵列${config.rectsPerMatrix}个矩形）`);
  
  // 创建单个Primitive，包含所有geometryInstances
  const primitive = new Cesium.Primitive({
    geometryInstances: geometryInstances,
    appearance: new Cesium.PerInstanceColorAppearance({
      flat: false,
      translucent: true
    }),
    asynchronous: false,
    show: true
  });
  
  // 添加到viewer
  viewer.scene.primitives.add(primitive);
  
  return primitive;
}

// ============ 使用示例 ============
// const viewer = new Cesium.Viewer('cesiumContainer');
// const primitive = addRectangleGridPrimitive(viewer, [116.391, 39.904], 25);  // 25个阵列

// ============ 使用示例 ============
// const viewer = new Cesium.Viewer('cesiumContainer');
// const primitive = addRectangleGridPrimitive(viewer, [116.391, 39.904], 100);

// ============ 如果需要移除图元 ============
// viewer.scene.primitives.remove(primitive);

// 调用示例：生成100个浅蓝色纯色矩形
// addBox3();

onMounted(() => {
  console.log('cesium-webgl 页面加载完成');
});

function printMemoryUsage() {
  // 1. Chrome/Edge专属：详细内存数据（最核心）
  if (window.performance && window.performance.memory) {
    const mem = window.performance.memory;
    // 单位转换：字节 → MB（保留2位小数）
    const formatMB = (bytes) => (bytes / 1024 / 1024).toFixed(2);

    console.log('===== 页面内存占用（通用）=====');
    console.log(`JS堆已使用内存: ${formatMB(mem.usedJSHeapSize)} MB`); // 当前使用的堆内存
    console.log(`JS堆总内存: ${formatMB(mem.totalJSHeapSize)} MB`);   // 已分配的堆内存
    console.log(`JS堆最大内存: ${formatMB(mem.jsHeapSizeLimit)} MB`); // 浏览器允许的最大堆内存
  } else {
    console.warn('当前浏览器不支持performance.memory（仅Chrome/Edge支持）');
  }

  // 2. 设备内存（粗略）
  if (navigator.deviceMemory) {
    console.log(`设备总内存: ${navigator.deviceMemory} GB`); // 设备物理内存（近似值）
  }

  // 3. Cesium专属：WebGL内存（关键！监控GPU内存）
  if (window.viewer && viewer.scene && viewer.scene.context) {
    const gl = viewer.scene.context._gl;
    // WebGL 2.0支持查询GPU内存（需浏览器支持）
    if (gl.getParameter) {
      try {
        // 不同浏览器的GPU内存查询参数（兼容写法）
        const GPU_MEMORY_PARAM = gl.GPU_MEMORY_INFO_DEDICATED_VIDMEM_ARB || 0x9047;
        const dedicatedMem = gl.getParameter(GPU_MEMORY_PARAM); // 专用GPU内存
        if (dedicatedMem) {
          console.log(`GPU专用内存: ${(dedicatedMem / 1024 / 1024).toFixed(2)} MB`);
        }
      } catch (e) {
        console.warn('无法查询GPU内存：', e.message);
      }
    }
    // Cesium 内置资源统计（纹理/缓冲区数量）
    const resources = viewer.scene.context.resourceManager;
    console.log(`Cesium纹理数量: ${resources.textureCount}`);
    console.log(`Cesium缓冲区数量: ${resources.bufferCount}`);
  }
}
window.printMemoryUsage = printMemoryUsage
</script>

<style scoped lang="scss">
.cesium-webgl-container {
  padding: var(--spacing-base);
  height: 100%;
  position: relative;
}
</style>