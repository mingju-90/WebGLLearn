import * as Cesium from 'cesium';


const DashStrokeMaterialSource = `
in float v_polylineAngle; 
uniform float dashLength;
uniform float uTime;
uniform sampler2D imageTexture; // 填充图片纹理
uniform float uProgress;        // 进度（0~1）
uniform float progressSmooth;   // 新增：进度过渡平滑度（默认0.01，越小越锐利）

const float maskLength = 16.0;
mat2 rotate(float rad) {
    return mat2(cos(rad), sin(rad), -sin(rad), cos(rad));
}

czm_material czm_getMaterial(czm_materialInput materialInput) {
    czm_material material = czm_getDefaultMaterial(materialInput);
    
    // ========== 核心优化1：预处理UV坐标，消除精度抖动 ==========
    // 1. 对st.s做微小偏移和精度修正，避免浮点误差导致的边界跳变
    float stS = materialInput.st.s;
    stS = clamp(stS, 0.0, 1.0); // 限制范围，避免越界
    stS = round(stS * 1000.0) / 1000.0; // 精度归一化，消除微小浮点差异
    
    // ========== 原有虚线逻辑（保留） ==========
    vec2 pos = rotate(v_polylineAngle) * gl_FragCoord.xy;
    float t = fract(uTime / 1500.0);
    t = clamp(t, 0.0, 1.0);
    float dashPos = fract(pos.x / (dashLength * czm_pixelRatio) - t);
    vec2 texCoord = vec2(dashPos, materialInput.st.t);
    
    vec4 patternColor = texture(imageTexture, texCoord);
    vec3 originalColor = czm_gammaCorrect(patternColor).rgb;
    float originalAlpha = patternColor.a;

    // ========== 核心优化2：平滑过渡灰度/彩色，消除突变 ==========
    // 1. 计算灰度颜色（提前计算，避免重复运算）
    float grayValue = dot(patternColor.rgb, vec3(0.299, 0.587, 0.114));
    vec3 grayColor = vec3(grayValue);
    vec3 grayGammaColor = czm_gammaCorrect(vec4(grayColor, patternColor.a)).rgb;

    // 2. 用smoothstep做平滑过渡，替代硬判断（核心消除闪动）
    // progressSmooth：过渡区间（0.005~0.02 最佳，根据折线长度调整）
    float mixFactor = smoothstep(uProgress - progressSmooth, uProgress + progressSmooth, stS);
    // mixFactor=0 → 彩色，mixFactor=1 → 灰度
    vec3 finalColor = mix(originalColor, grayGammaColor, mixFactor);

    // ========== 赋值材质（统一赋值，避免分支导致的渲染不一致） ==========
    material.emission = finalColor;
    material.alpha = originalAlpha;

    return material;
}
`

class ProgressiveTextureMaterial  {
  constructor(options = {}) {
    this._definitionChanged = new Cesium.Event();
    // 唯一材质类型名，避免冲突
    this._type = 'MyDashStrokeMaterial'
    // 响应式属性
    this._dashLength = options.dashLength || 30.0;
    this._progress = options.progress || 100.0;

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
          uTime: 0,
          uProgress: 1.0,
          progressSmooth: 0.008,
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
    result.uProgress = this._progress / 100
    result.progressSmooth = 0.008
    return result;
  }
  equals(other) {
    return this === other || (other instanceof ProgressiveTextureMaterial  && other._type === this._type);
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
  setProgress(progress) {
    if(this._progress !== progress) {
      this._progress = progress
    }
  }
  static get isConstant() { return true; }
  get definitionChanged() { return this._definitionChanged; }
}
export default ProgressiveTextureMaterial ;