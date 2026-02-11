import * as Cesium from 'cesium';

// 1. 获取默认材质
// 2. 提取纹理坐标 st
// 3. 计算网格坐标：乘以网格数量，分别获取整数和小数部分
// 4. 棋盘判断：通过 x+y 坐标和的奇偶性判断格子颜色
// 5. 抗锯齿处理：在网格边界创建平滑过渡效果
// 6. 颜色混合：根据奇偶性和抗锯齿强度混合最终颜色
// 7. 材质输出：设置漫反射和自发光颜色
// 8. 返回最终材质
// 自定义着色器源码（GLSL）
const GridMaterialSource = `
uniform float uGridCount;         // 网格重复次数
uniform vec4 uEvenColor;
uniform vec4 uOddColor;
uniform float uAntiAlias;   // 抗锯齿强度

czm_material czm_getMaterial(czm_materialInput materialInput) {
    czm_material material = czm_getDefaultMaterial(materialInput);
    vec2 st = materialInput.st;

    vec2 gridUV = st * uGridCount;
    vec2 gridInt = floor(gridUV);
    vec2 gridFract = fract(gridUV);

    float sum = gridInt.x + gridInt.y;
    float isEven = 1.0 - step(1.0, mod(sum, 2.0));

    vec2 antiAlias = smoothstep(0.0, uAntiAlias, gridFract) * smoothstep(1.0, 1.0 - uAntiAlias, gridFract);
    float edgeSmooth = min(antiAlias.x, antiAlias.y);

    isEven = mix(isEven, 0.5, 1.0 - edgeSmooth);

    vec3 finalColor = mix(uOddColor.rgb, uEvenColor.rgb, isEven);
    float finalAlpha = mix(uOddColor.a, uEvenColor.a, isEven);


    material.diffuse = finalColor;
    material.emission = finalColor;

   
    return material;
}
`;

/**
 * Cesium 自定义材质类
 * @param {Object} options - 初始化参数
 */
class GridMaterial {
  constructor(options = {}) {
    this._definitionChanged = new Cesium.Event();
    this._type = 'GridMaterial_MyMaterial'; // 唯一材质类型名

    // 初始化参数（带默认值）
    this._gridCount = options.gridCount || 20;
    this._oddColor = options.oddColor || 'red'
    this._evenColor = options.evenColor || 'blue'

    // 注册材质到 Cesium 缓存
    this._registerMaterial();
  }

  /** 注册材质（清理旧缓存+初始化） */
  _registerMaterial() {
    const type = this._type;
    // 清理旧缓存避免冲突
    if (Cesium.Material._materialCache.getMaterial(type)) {
      delete Cesium.Material._materialCache._materials[type];
    }
    // 注册材质
    Cesium.Material._materialCache.addMaterial(type, {
      fabric: {
        type: type,
        uniforms: {
          uGridCount: 10,
          uAntiAlias: 0.01,
          uEvenColor: Cesium.Color.RED,
          uOddColor: Cesium.Color.BLUE,
        },
        source: GridMaterialSource
      },
      translucent: true // 支持透明
    });
  }

  /** 每帧更新 uniform 参数 */
  getValue(time, result) {
    if (!result) result = {};
    result.uGridCount = this._gridCount;
    result.uAntiAlias = 0.005
    result.uEvenColor = Cesium.Color.fromCssColorString(this._evenColor)
    result.uOddColor = Cesium.Color.fromCssColorString(this._oddColor)
    return result;
  }
  setGridCount(gridCount) {
    if(this._gridCount == gridCount) return
    this._gridCount = gridCount
  }
  /** 动态修改颜色 */
  setEvenColor(color) {
    if(this._evenColor == color) return
    this._evenColor = color
  }
  setOddColor(color) {
    if(this._oddColor == color) return
    this._oddColor = color
  }

  // Cesium 材质必须实现的接口
  getType() {
    return this._type;
  }

  equals(other) {
    return this === other || (other instanceof GridMaterial && other._type === this._type);
  }

  static get isConstant() {
    return false; // 标记为动态材质（每帧更新）
  }

  get definitionChanged() {
    return this._definitionChanged;
  }
}

export default GridMaterial;