import * as Cesium from 'cesium';

// 自定义着色器源码（GLSL）
const BreathingLightMaterialSource = `
uniform vec4 uColor;                // 主颜色（rgba）
uniform float uTime;                // 时间戳（动态参数）
uniform float uSpeed;

czm_material czm_getMaterial(czm_materialInput materialInput) {
    czm_material material = czm_getDefaultMaterial(materialInput);
    vec2 st = materialInput.st;
    vec2 center = vec2(0.5);


    float dist = length(st - center) * 1.4142; // √2 ≈ 1.4142
    float t = fract(uTime / uSpeed / 1000.) * 2.;
    float pulse = (1. - abs(t - 1.)) / 2.;
    material.emission = uColor.rgb;
    material.alpha = 1.0 - smoothstep(pulse, pulse + 0.3, dist);
    return material;
}
`;

/**
 * Cesium 自定义材质类
 * @param {Object} options - 初始化参数
 */
class BreathingLightMaterial {
  constructor(options = {}) {
    this._definitionChanged = new Cesium.Event();
    this._type = 'BreathingLightMaterial_MyMaterial'; // 唯一材质类型名

    // 初始化参数（带默认值）
    this._color = options.color || 'red';
    this._speed = options.speed || 2;

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
          uColor: Cesium.Color.RED,
          uTime: 0.0,
          uSpeed: 2,
        },
        source: BreathingLightMaterialSource
      },
      translucent: true // 支持透明
    });
  }

  /** 每帧更新 uniform 参数 */
  getValue(time, result) {
    if (!result) result = {};
    // 传递颜色参数
    result.uColor = Cesium.Color.fromCssColorString(this._color);
    // 传递动态时间
    result.uTime = performance.now();
    console.log('_speed', this._speed)
    result.uSpeed = this._speed
    return result;
  }

  /** 动态修改颜色 */
  setColor(color) {
    if(this._color === color) return
    this._color = color;
  }
  setSpeed(speed) {
    if(this._speed === speed) return
    this._speed = speed
  }

  // Cesium 材质必须实现的接口
  getType() {
    return this._type;
  }

  equals(other) {
    return this === other || (other instanceof BreathingLightMaterial && other._type === this._type);
  }

  static get isConstant() {
    return false; // 标记为动态材质（每帧更新）
  }

  get definitionChanged() {
    return this._definitionChanged;
  }
}

export default BreathingLightMaterial;