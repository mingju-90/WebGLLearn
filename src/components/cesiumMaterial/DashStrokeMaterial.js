import * as Cesium from 'cesium';


const DashStrokeMaterialSource = `
in float v_polylineAngle; 
uniform vec4 color;
uniform vec4 bgColor;
uniform float dashLength;
const float maskLength = 16.0;
mat2 rotate(float rad) {
    return mat2(cos(rad), sin(rad), -sin(rad), cos(rad));
}
czm_material czm_getMaterial(czm_materialInput materialInput) {
    czm_material material = czm_getDefaultMaterial(materialInput);
        float isEdge = step(abs(materialInput.st.t - 0.5), 0.2);
        if(isEdge < 0.5) {
        material.diffuse = bgColor.rgb;
        material.alpha = bgColor.a;
          return material;
        }
    // 核心虚线逻辑
    // pos 像素的坐标 rotate(v_polylineAngle) * gl_FragCoord.xy 通用最优范式
    vec2 pos = rotate(v_polylineAngle) * gl_FragCoord.xy;

    // dashLength * czm_pixelRatio 像素长度 * 分辨率 dashPos 0-1代表一个虚线周期
    float dashPos = fract(pos.x / (dashLength * czm_pixelRatio));

    vec4 fragColor = dashPos < 0.5 ? bgColor : color;
    if (fragColor.a < 0.005) discard;
    material.emission = czm_gammaCorrect(fragColor).rgb;
    material.alpha = fragColor.a;
    return material;
}
`

class DashStrokeMaterial {
  constructor(options = {}) {
    this._definitionChanged = new Cesium.Event();
    // 唯一材质类型名，避免冲突
    this._type = 'MyDashStrokeMaterial'
    
    // 响应式属性
    this._color = options.color || Cesium.Color.WHITE;
    this._bgColor = options.bgColor || Cesium.Color.RED;
    this._dashLength = options.dashLength || 30.0;
    
    this._registerMaterial();
  }
  _registerMaterial() {
    const type = this._type;
    console.log('_registerMaterial', type)
    // 清理旧缓存
    if (Cesium.Material._materialCache.getMaterial(type)) {
      delete Cesium.Material._materialCache._materials[type];
    }
    Cesium.Material._materialCache.addMaterial(type, {
      fabric: {
        type: type,
        uniforms: {
          color: Cesium.Color.WHITE,
          bgColor: Cesium.Color.RED,
          dashLength: 16.0,
        },
        source: DashStrokeMaterialSource
      },
      translucent: () => true
    });
  }
  getType() {
    return this._type;
  }
  getValue(time, result) {
    if (!result) result = {};
    result.color = this._color;
    result.bgColor = this._bgColor;
    result.dashLength = this._dashLength;
    return result;
  }
  equals(other) {
    return this === other || (other instanceof DashStrokeMaterial && other._type === this._type);
  }
  // 响应式设置方法
  setColor(color) {
    if (!Cesium.Color.equals(this._color, color)) {
      this._color = color;
      this._definitionChanged.raise();
    }
  }
 
  setBgColor(color) {
    if (!Cesium.Color.equals(this._bgColor, color)) {
      this._bgColor = color;
      this._definitionChanged.raise();
    }
  }
  setDashLength(length) {
    if (this._dashLength !== length) {
      this._dashLength = length;
      this._definitionChanged.raise();
    }
  }
  static get isConstant() { return true; }
  get definitionChanged() { return this._definitionChanged; }
}
export default DashStrokeMaterial;