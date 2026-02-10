import * as Cesium from 'cesium';


const DashStrokeMaterialSource = `
in float v_polylineAngle; 
uniform float dashLength;
uniform float uTime;
uniform sampler2D imageTexture; // 填充图片纹理


const float maskLength = 16.0;
mat2 rotate(float rad) {
    return mat2(cos(rad), sin(rad), -sin(rad), cos(rad));
}
czm_material czm_getMaterial(czm_materialInput materialInput) {
    czm_material material = czm_getDefaultMaterial(materialInput);
    
    // 核心虚线逻辑
    // pos 像素的坐标 rotate(v_polylineAngle) * gl_FragCoord.xy 通用最优范式
    vec2 pos = rotate(v_polylineAngle) * gl_FragCoord.xy;

    float t = fract(uTime / 1500.0);
    t = clamp(t, 0.0, 1.0);

    float dashPos = fract(pos.x / (dashLength * czm_pixelRatio) - t);
    
    vec2 texCoord = vec2(dashPos, materialInput.st.t);

    vec2 rotatedTexCoord = texCoord;

    vec4 patternColor = texture(imageTexture, texCoord);
    material.emission = czm_gammaCorrect(patternColor).rgb;
    material.alpha = patternColor.a;

    return material;
}
`

class FlowingTexturePolylineMaterial {
  constructor(options = {}) {
    this._definitionChanged = new Cesium.Event();
    // 唯一材质类型名，避免冲突
    this._type = 'MyDashStrokeMaterial'
    // 响应式属性
    this._dashLength = options.dashLength || 30.0;

    // 1. 默认纹理：优先用传入的，否则加载内置默认图片（建议替换为你的默认图片路径）
    this._setImageTexture(options.imageTexture || '/111.png');
    this._registerMaterial();
  }
  _setImageTexture(url) {
    this._imageTexture = url
  }
  _registerMaterial() {
    const type = this._type;
    // 清理旧缓存
    if (Cesium.Material._materialCache.getMaterial(type)) {
      delete Cesium.Material._materialCache._materials[type];
    }
    Cesium.Material._materialCache.addMaterial(type, {
      fabric: {
        type: type,
        uniforms: {
          dashLength: 16.0,
          imageTexture: this._imageTexture, // 注册默认纹理到uniform
          uTime: 0
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
    result.dashLength = this._dashLength;
    result.imageTexture = this._imageTexture; // 传递纹理到着色器
    result.uTime = performance.now()
    return result;
  }
  equals(other) {
    return this === other || (other instanceof FlowingTexturePolylineMaterial && other._type === this._type);
  }

  // 5. 新增：设置自定义纹理的方法
  async setImageTexture(texture) {
    if (this._imageTexture !== texture) {
      await this._setImageTexture(texture);
      this._definitionChanged.raiseEvent();
    }
  }

  setDashLength(length) {
    if (this._dashLength !== length) {
      this._dashLength = length;
      this._definitionChanged.raiseEvent();
    }
  }
  static get isConstant() { return true; }
  get definitionChanged() { return this._definitionChanged; }
}
export default FlowingTexturePolylineMaterial;