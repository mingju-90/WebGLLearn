import * as Cesium from 'cesium';


const FlowLineMateriaSource = `
uniform vec4 color;
uniform float uTime;

czm_material czm_getMaterial(czm_materialInput materialInput) {
    czm_material material = czm_getDefaultMaterial(materialInput);
    vec2 st = materialInput.st;

    float t = fract(czm_frameNumber / 1000.0);
    // 设置边界值
    t = clamp(t, 0.0, 1.0);
    float alpha = 0.0;
    if(st.s >= t - 0.03 && st.s < t) {
      alpha = smoothstep(t - 0.03, t, st.s);
    }
    vec4 fragColor;
    // 给本身的材质一个发光
    material.diffuse = color.rgb * 2.;
    material.alpha = alpha;
    material.emission = color.rgb * 3.;
    return material;
}
`

class FlowLineMateria {
  constructor(options = {}) {
    this._definitionChanged = new Cesium.Event();
    // 唯一材质类型名，避免冲突
    this._type = 'MyFlowLineMateria'
    
    // 响应式属性
    this._color = options.color || Cesium.Color.RED;
    
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
          color: Cesium.Color.RED,
        },
        source: FlowLineMateriaSource
      },
      translucent: true,
    });
  }
  getType() {
    return this._type;
  }
  getValue(time, result) {
    if (!result) result = {};
    result.color = this._color;
    return result;
  }
  equals(other) {
    return this === other || (other instanceof FlowLineMateria && other._type === this._type);
  }
  // 响应式设置方法
  setColor(color) {
    if (!Cesium.Color.equals(this._color, color)) {
      this._color = color;
      this._definitionChanged.raise();
    }
  }
 
  static get isConstant() { return true; }
  get definitionChanged() { return this._definitionChanged; }
}
export default FlowLineMateria;