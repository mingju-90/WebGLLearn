import * as Cesium from 'cesium';
/** 代表 */
const borderLineSource = /* glsl */ `
#pragma vscode_glsllint_stage : frag //pragma to set STAGE to 'frag'

uniform vec4 edgeColor;   // 两侧边框色
uniform float edgeRatio;  // 单侧边框占比（0~0.5）
uniform float dashLength; // 预留参数（未使用，可删除）

czm_material czm_getMaterial(czm_materialInput m) {
    // 1. 获取默认材质模板
    czm_material mat = czm_getDefaultMaterial(m);
    
    // 2. 判断是否为边框区域
    float isEdge = step(abs(m.st.t - 0.5), edgeRatio);
    
    // 3. 写死背景色为蓝色（rgba：0,0,1,1 → 纯蓝色，不透明）
    // 可调整 alpha（最后一位）实现透明，比如 vec4(0,0,1,0.7) → 半透明蓝
    vec4 bgColor = vec4(0.0, 0.0, 1.0, 1.0);
    
    // 4. 混合颜色：边框用 edgeColor，背景用写死的蓝色
    vec4 finalColor = isEdge > 0.5 ? edgeColor : bgColor;
    
    // 5. 赋值材质属性
    mat.diffuse = finalColor.rgb;
    mat.alpha = finalColor.a;
    
    return mat;
}
`

/**
 * PolylineEdgeMaterial - 横向两侧深蓝描边 + 中间浅蓝背景
 * 效果：横截面始终是 [深蓝][浅蓝][深蓝]，纵向无限延伸
 */
class PolylineEdgeMaterial {
    constructor(options = {}) {
        this._definitionChanged = new Cesium.Event();

        this._edgeColor = undefined;
        this._bgColor = undefined;
        this._edgeRatio = undefined;

        this._type = 'PolylineEdge';

        this.edgeColor = options.edgeColor || Cesium.Color.fromCssColorString('#003366');
        this.bgColor = options.bgColor || Cesium.Color.fromCssColorString('#66CCFF').withAlpha(0.7);
        this.edgeRatio = options.edgeRatio ?? 0.4; // 两侧各 20%
        this.dashLength = options.dashLength ?? 16.0;

        this._registerMaterial();
    }

    _registerMaterial() {
        const type = this._type;
        if (Cesium.Material._materialCache.getMaterial(type)) return;

        Cesium.Material._materialCache.addMaterial(type, {
            fabric: {
                type,
                uniforms: {
                    edgeColor: new Cesium.Color(0, 0.2, 0.4, 1),
                    bgColor: new Cesium.Color(0.4, 0.8, 1.0, 0.7),
                    edgeRatio: 0.2,
                    dashLength: 16.0,
                },
                source: borderLineSource
            },
            translucent: () => true
        });
    }

    getType() { return this._type; }

    getValue(time, result) {
        if (!result) result = {};
        result.edgeColor = Cesium.Property.getValueOrClonedDefault(
            this._edgeColor, time,
            Cesium.Color.fromCssColorString('#003366'), result.edgeColor
        );
        result.bgColor = Cesium.Property.getValueOrClonedDefault(
            this._bgColor, time,
            Cesium.Color.fromCssColorString('#66CCFF').withAlpha(0.7), result.bgColor
        );
        result.edgeRatio = Cesium.Property.getValueOrDefault(
            this._edgeRatio, time, 0.2, result.edgeRatio
        );
        return result;
    }

    equals(other) {
        return this === other ||
            (other instanceof PolylineEdgeMaterial &&
                Cesium.Property.equals(this._edgeColor, other._edgeColor) &&
                Cesium.Property.equals(this._bgColor, other._bgColor) &&
                Cesium.Property.equals(this._edgeRatio, other._edgeRatio));
    }

    static get isConstant() { return false; }
    get definitionChanged() { return this._definitionChanged; }
}

// 响应式属性
Object.defineProperties(PolylineEdgeMaterial.prototype, {
    edgeColor: Cesium.createPropertyDescriptor('edgeColor'),
    bgColor: Cesium.createPropertyDescriptor('bgColor'),
    edgeRatio: Cesium.createPropertyDescriptor('edgeRatio')
});

export default PolylineEdgeMaterial;