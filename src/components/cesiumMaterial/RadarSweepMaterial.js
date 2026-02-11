import * as Cesium from 'cesium';

const RadarSweepMaterialSource = `
uniform vec4 uColor;                // 扫描扇区颜色（rgba）
uniform float uRadius;              // 扫描半径
uniform float uRotateRadianPerSecond; // 每秒旋转弧度
uniform float uTime;                // 时间戳（毫秒）

// 绘制扇形的核心函数
float drawSector(vec2 uv, float radius) {
    // 1. 修正时间单位：毫秒转秒
    float angle = (uTime / 1000.0) * uRotateRadianPerSecond;
    // 2. 旋转矩阵（逆时针旋转）
    mat2 rotateMat = mat2(cos(angle), sin(angle), -sin(angle), cos(angle));
    vec2 rotatedUv = rotateMat * uv;

    vec2 xAxis = vec2(1.0, 0.0);
    vec2 yAxis = vec2(0.0, 1.0);
    float yDot = dot(rotatedUv, yAxis);
    
    // 避免长度为0时normalize报错
    float uvLength = length(rotatedUv);
    float angle2 = uvLength < 0.001 ? 0.0 : acos(clamp(dot(xAxis, normalize(rotatedUv)), -1.0, 1.0));

    float inSector = 0.0;
    float scanRadius = 0.45 * radius;
    
    // 扇形范围：0~90°（π/2）+ 半径内 + 上半区
    float maxAngle = 1.5707;
    if (angle2 > 0.0 && angle2 < maxAngle && uvLength < scanRadius && yDot > 0.0) {
        inSector = 1.0 - smoothstep(0.0, maxAngle, angle2);
    }
    return inSector;
}

czm_material czm_getMaterial(czm_materialInput materialInput) {
    czm_material material = czm_getDefaultMaterial(materialInput);
    
    // UV坐标预处理：中心化+缩放（适配Cesium UV范围0~1）
    vec2 uv = materialInput.st - vec2(0.5); // 中心化到(0,0)
    uv *= uRadius;                          // 缩放匹配半径

    // 计算扇形扫描强度
    float sectorIntensity = drawSector(uv, uRadius);
    
    // 修复维度不匹配：提取uColor的rgb分量（vec3）
    vec3 finalColor = sectorIntensity * uColor.rgb;

    // Cesium材质规范赋值（删除错误的transparent字段）
    material.diffuse = finalColor;          // 漫反射颜色
    material.emission = finalColor;         // 自发光（增强亮度，不受光照影响）
    material.alpha = sectorIntensity * uColor.a; // 透明度（结合颜色的alpha）

    return material;
}
`;

class RadarSweepMaterial {
  constructor(options = {}) {
    this._definitionChanged = new Cesium.Event();
    // 唯一材质类型名（避免冲突）
    this._type = 'MyRadarSweepMaterial';
    
    // 初始化参数（带默认值）
    this._color = options.color || 'red';
    this._radius = options.radius || 1.0;
    this._rotateRadianPerSecond = options.rotateRadianPerSecond || Cesium.Math.PI / 2;
    
    this._registerMaterial();
  }

  /** 注册材质（仅初始化时执行一次） */
  _registerMaterial() {
    const type = this._type;
    // 清理旧缓存避免冲突
    if (Cesium.Material._materialCache.getMaterial(type)) {
      delete Cesium.Material._materialCache._materials[type];
    }
    // 注册材质到Cesium缓存
    Cesium.Material._materialCache.addMaterial(type, {
      fabric: {
        type: type,
        uniforms: {
          uColor: Cesium.Color.RED,
          uTime: 0.0,
          uRotateRadianPerSecond: Cesium.Math.PI / 2,
          uRadius: 1.0
        },
        source: RadarSweepMaterialSource
      },
      translucent: true // 这里设置材质支持透明（正确位置）
    });
  }

  /** 每帧更新uniform参数（核心：传递最新时间和参数） */
  getValue(time, result) {
    if (!result) result = {};
    // 转换颜色：CSS颜色字符串 → Cesium.Color
    result.uColor = Cesium.Color.fromCssColorString(this._color);
    // 传递动态参数
    result.uTime = performance.now();
    result.uRotateRadianPerSecond = this._rotateRadianPerSecond;
    result.uRadius = this._radius;
    return result;
  }

  /** 动态设置颜色（触发材质更新） */
  setColor(color) {
    const newColor = Cesium.Color.fromCssColorString(color);
    const oldColor = Cesium.Color.fromCssColorString(this._color);
    if (!Cesium.Color.equals(oldColor, newColor)) {
      this._color = color;
      this._definitionChanged.raiseEvent(); // 触发参数更新
    }
  }

  /** 动态设置旋转速度（每秒弧度） */
  setRotateRadianPerSecond(radian) {
    if (this._rotateRadianPerSecond !== radian) {
      this._rotateRadianPerSecond = radian;
      this._definitionChanged.raiseEvent();
    }
  }

  /** 动态设置扫描半径 */
  setRadius(radius) {
    if (this._radius !== radius && radius > 0) {
      this._radius = radius;
      this._definitionChanged.raiseEvent();
    }
  }

  // Cesium材质必须实现的接口
  getType() {
    return this._type;
  }

  equals(other) {
    return this === other || (other instanceof RadarSweepMaterial && other._type === this._type);
  }

  // 标记为动态材质（每帧更新参数）
  static get isConstant() {
    return false;
  }

  get definitionChanged() {
    return this._definitionChanged;
  }
}

export default RadarSweepMaterial;