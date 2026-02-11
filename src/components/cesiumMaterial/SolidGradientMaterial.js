import * as Cesium from 'cesium';


// 1. 获取默认材质
// 2. 提取纹理坐标 st
// 3. 将角度转换为方向向量
// 4. 计算坐标与方向的点积（得到渐变值）
// 5. 限制渐变值在 0,1 范围
// 6. 根据渐变值插值颜色
// 7. 返回最终材质

// 自定义着色器源码（GLSL）
const SolidGradientMaterialSource = `
uniform float uGradientDirection;                // 渐变角度
uniform vec4 uStartColor;
uniform vec4 uEndColor;

// 角度值转方向向量
vec2 angleToDirection(float a) {
    float rad = radians(a);
    return vec2(cos(rad), sin(rad));
}

czm_material czm_getMaterial(czm_materialInput materialInput) {

    
    czm_material material = czm_getDefaultMaterial(materialInput);

    vec2 st = materialInput.st;
    // 获取角度对应的向量
    vec2 direction = angleToDirection(uGradientDirection);
    float gradient = dot(st, direction);
    gradient = clamp(gradient, 0.0, 1.0);
    material.diffuse = mix(uStartColor.rgb, uEndColor.rgb, gradient);

    return material;
}
`;

/**
 * Cesium 自定义材质类
 * @param {Object} options - 初始化参数
 */
class SolidGradientMaterial {
  constructor(options = {}) {
    this._definitionChanged = new Cesium.Event();
    this._type = 'SolidGradientMaterial_MyMaterial'; // 唯一材质类型名

    // 初始化参数（带默认值）
    this._startColor = options.startColor || 'red';
    this._endColor = options.endColor || 'blue';

    //  0 | 90 | 45 | 135  // 度数
    this._gradientDirection = options.gradientDirection || 0

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
          uGradientDirection: 0.0,
          uStartColor: Cesium.Color.RED,
          uEndColor: Cesium.Color.RED,
        },
        source: SolidGradientMaterialSource
      },
      translucent: true // 支持透明
    });
  }

  /** 每帧更新 uniform 参数 */
  getValue(time, result) {
    if (!result) result = {};
    result.uGradientDirection = this._gradientDirection;
    result.uStartColor = Cesium.Color.fromCssColorString(this._startColor)
    result.uEndColor = Cesium.Color.fromCssColorString(this._endColor)
    return result;
  }
  setStartColor(color) {
    if(this._startColor === color) return
    this._startColor = color
  }
  setEndColor(color) {
    if(this._endColor === color) return
    this._endColor = color
  }
  setGradientDirection(gradientDirection) {
    if(this._gradientDirection === gradientDirection) return
    this._gradientDirection = gradientDirection
  }

  // Cesium 材质必须实现的接口
  getType() {
    return this._type;
  }

  equals(other) {
    return this === other || (other instanceof SolidGradientMaterial && other._type === this._type);
  }

  static get isConstant() {
    return false; // 标记为动态材质（每帧更新）
  }

  get definitionChanged() {
    return this._definitionChanged;
  }
}

export default SolidGradientMaterial;