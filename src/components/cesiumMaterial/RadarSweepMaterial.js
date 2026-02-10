import * as Cesium from 'cesium';


const RadarSweepMaterialSource = `
uniform vec4 color; // 传入的颜色（含透明度）
uniform float uTime;
czm_material czm_getMaterial(czm_materialInput materialInput) {
    czm_material material = czm_getDefaultMaterial(materialInput);
    material.diffuse = 1.5 * color.rgb; // 增强颜色亮度
    vec2 st = materialInput.st; // UV坐标，范围 [0,1]x[0,1]
    vec2 center = vec2(0.5); // 圆心UV坐标
    float dis = distance(st, center); // 像素到圆心的距离（0~0.707）

    
    // 归一化距离到 0~1（匹配圆形边缘）
    float normalizedDis = dis * 2.0;
    normalizedDis = clamp(normalizedDis, 0.0, 1.0); // 限制范围，避免异常

    // 修复1：整数改为浮点数，解决类型不匹配
    float frameFactor = fract(uTime / 3000.0); // 1000 → 1000.0
    
    // 三道扩散环：时间偏移 0/0.3/0.6，实现循环叠加
    float per1 = fract(frameFactor);
    float per2 = fract(frameFactor - 0.33);
    float per3 = fract(frameFactor - 0.66);

    // 计算每道环的显示范围
    float ringRadius1 = per1 * 0.3;
    float ringRadius2 = per2 * 0.3;
    float ringRadius3 = per3 * 0.3;

    // ========== 修复2：替换 !step 为 step(x, a)，兼容 GLSL 语法 ==========
    // step(x, a) 等价于 !step(a, x)：x < a 时返回 1.0，否则返回 0.0
    float pass1 = step(normalizedDis, ringRadius1) == 1.0 ? color.a * (normalizedDis / max(per1, 0.01)) : 0.0;
    float pass2 = step(normalizedDis, ringRadius2) == 1.0 ? color.a * (normalizedDis / max(per2, 0.01)) : 0.0;
    float pass3 = step(normalizedDis, ringRadius3) == 1.0 ? color.a * (normalizedDis / max(per3, 0.01)) : 0.0;

    // 扩散过程中透明度渐变消失
    pass1 = pass1 * (1.0 - per1) * 2.0;
    pass2 = pass2 * (1.0 - per2) * 2.0;
    pass3 = pass3 * (1.0 - per3) * 2.0;

    // 叠加三道环的透明度，限制范围避免过亮/异常
    material.alpha = clamp(pass1 + pass2 + pass3, 0.0, 1.0);
    
    // 高版本Cesium需显式输出颜色（避免渲染异常）
    out_FragColor = vec4(material.diffuse, material.alpha);
    return material;
}
`

class RadarSweepMaterial {
  constructor(options = {}) {
    this._definitionChanged = new Cesium.Event();
    // 唯一材质类型名，避免冲突
    this._type = 'MyRadarSweepMaterial'
    
    // 响应式属性
    this._color = options.color || 'red';
    
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
          uTime: 0,
        },
        source: RadarSweepMaterialSource
      },
      translucent: true,
    });
  }
  getType() {
    return this._type;
  }
  getValue(time, result) {
    if (!result) result = {};
    result.color = Cesium.Color.fromCssColorString(this._color);
    result.uTime = performance.now()
    return result;
  }
  equals(other) {
    return this === other || (other instanceof RadarSweepMaterial && other._type === this._type);
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
export default RadarSweepMaterial;