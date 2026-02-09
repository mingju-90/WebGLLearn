
## Cesium 自定义材质类的核心规范
cesium 对自定义材质有明确的接口要求, 必须实现以下核心:

```js

class MyMaterial {
    constructor() {
        // 初始化参数变更事件, 核心要求
        this._definitionChanged = new Cesium.Event()
        // 材质唯一标识
        this._type = 'MyMaterial'
        // 注册材质(只执行一次)
        this._registerMaterial()
    }
    /** 注册材质 */
    _registerMaterial() {
        const type = this._type
        // 判断是否已经注册
        if(Cesium.Material._materialCache.getMaterial(type)) return

        Cesium.Material._materialCache.addMaterial(type, {
            fabric: {
                type,
                // 声称 GLSL 全局变量
                uniforms: {}
            },
            source: `
            /**
             * 核心函数：每个像素都会执行，返回当前像素的材质信息
             * @param {czm_materialInput} materialInput - Cesium 内置材质输入参数
             * @returns {czm_material} - 最终渲染的材质对象
             */
            czm_material czm_getMaterial(czm_materialInput materialInput) {
                // 创建默认材质（基于 Cesium 内置默认材质）
                czm_material material = czm_getDefaultMaterial(materialInput);
                // 返回材质（可在此扩展自定义材质逻辑）
                return material;
            }
            `
        })
    }
    /** 返回材质类型 */
    getType() {
        return this._type
    }
    /**
     * 核心接口：返回当前材质的 uniforms 参数
     * Cesium 渲染时会调用此方法获取最新的参数值
     * @param {Cesium.JulianDate} time - 时间参数（动态材质可用）
     * @param {Object} result - 结果对象（用于复用，减少内存分配）
     * @returns {Object} uniforms 参数对象
     */
    getValue(time, result) {
        if(!result) result = {}
        return result
    }
    /**
     * 核心接口：材质实例比较（用于 Cesium 缓存优化）
     * @param {MyMaterial} other - 待比较的材质实例
     * @returns {boolean} 是否为相同材质
     */
    equals(other) {
        if(!other || !(other instanceof MyMaterial)) return false
        // 省略 uniforms 属性对比
        return true
    }
    /**
     * 静态属性：是否为常量材质
     * false 表示支持动态更新（修改参数后触发渲染刷新）
     * @returns {boolean}
     */
    static get isConstant() {
        return false;
    }
    /**
     * 只读属性：参数变更事件（Cesium 监听此事件实现材质更新）
     * @returns {Cesium.Event}
     */
    get definitionChanged() {
        return this._definitionChanged
    }
}

```