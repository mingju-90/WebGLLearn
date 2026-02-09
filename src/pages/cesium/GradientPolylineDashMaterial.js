import * as Cesium from 'cesium';

class PolylineDashMaterial {
  constructor() {
    this._definitionChanged = new Cesium.Event();
    // 唯一材质类型名，避免冲突
    this._type = 'MyPolyLine'
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
          gapColor: Cesium.Color.TRANSPARENT,
          bgColor: Cesium.Color.RED,

          dashLength: 16.0,
          dashPattern: 255.0
        },
        source: `
// 关键修复1：GLSL 3.00 中用 in 替代 varying
in float v_polylineAngle; 

uniform vec4 color;
uniform vec4 bgColor;
uniform vec4 gapColor;
uniform float dashLength;
uniform float dashPattern;

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
    vec2 pos = rotate(v_polylineAngle) * gl_FragCoord.xy;
    float dashPos = fract(pos.x / (dashLength * czm_pixelRatio));
    float maskIdx = floor(dashPos * maskLength);
    float maskTest = floor(dashPattern / pow(2.0, maskIdx));
    vec4 fragColor = mod(maskTest, 2.0) < 1.0 ? bgColor : color;

    if (fragColor.a < 0.005) discard;
    material.emission = czm_gammaCorrect(fragColor).rgb;
    material.alpha = fragColor.a;

    return material;
}
                `
      },
      translucent: () => true
    });
  }

  getType() {
    return this._type;
  }

  getValue(time, result) {
    if (!result) result = {};
    result.color = Cesium.Color.WHITE;
    result.gapColor = Cesium.Color.TRANSPARENT;
    result.bgColor = Cesium.Color.RED;
    result.dashLength = 30.0;
    result.dashPattern = 255.0;
    return result;
  }

  equals(other) {
    return this === other || (other instanceof PolylineDashMaterial && other._type === this._type);
  }

  static get isConstant() { return true; }
  get definitionChanged() { return this._definitionChanged; }
}

export default PolylineDashMaterial;