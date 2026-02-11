
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


## 基础知识

### 向量
1. 向量定义
向量：有大小和方向的量，用坐标表示 (x, y)
2. 坐标含义
- x 坐标：水平位置，正数向右，负数向左
- y 坐标：垂直位置，正数向上，负数向下
3. 向量类型
3.1 位移向量（位置差值向量）
- 特点：长度表示实际距离
- 用途：表示完整移动
- 公式：新位置 = x + x1, y + y1
- 示例：从1,1用向量(3,4)移动 → 4,5
3.2 方向向量
- 特点：长度为1（归一化）
- 用途：表示纯方向，需配合距离
- 公式：新位置 = x + d×x1, y + d×y1
- 示例：方向(0.6,0.8)，距离5 → x + 3, y + 4
4. 常用方向向量

| 方向 | 向量 | 说明 |
|------|------|------|
| 水平向右 | (1, 0) | 0° |
| 水平向左 | (-1, 0) | 180° |
| 垂直向上 | (0, 1) | 90° |
| 垂直向下 | (0, -1) | 270° |
| 45度角 | (√2/2, √2/2) | ≈ (0.707, 0.707) |
5. 向量计算
5.1 角度转方向向量
x = cos(角度)
y = sin(角度)
5.2 向量归一化
length = √(x² + y²)
unitVector = (x/length, y/length)
5.3 判断是否归一化
isNormalized = |√(x² + y²) - 1| < 0.0001
6. 使用场景
- 碰撞检测：位移向量
- 移动计算：方向向量
- 路径规划：两者结合
- 角度转换：通常输出方向向量
7. 关键区别

| 特征 | 位移向量 | 方向向量 |
|------|----------|----------|
| 长度 | 实际距离 | 1 |
| 使用 | 直接相加 | 乘距离后相加 |
| 用途 | 完整移动 | 纯方向指示 |


## GLSL 内置方法
GLSL 材质渐变函数参考表
内置函数
| 函数名 | 参数 | 返回值 | 用途 |
|--------|------|--------|------|
| czm_getDefaultMaterial() | materialInput | czm_material | 获取默认材质 |
| dot() | vec2, vec2 | float | 计算向量点积, 判断两个向量的朝向相似度, 一致为1, 相反为0 |
| clamp() | float, float, float | float | 限制值范围 |
| mix() | vec3, vec3, float | vec3 | 线性插值 |
| min() | float, float | float | 获取较小值 |
| floot() | vec2/float | vec2/float | 向下取整 |
| mod() | float, float | float | 模运算(求余数, 相对于js的 %) |
| setp() | float, float | float | 第二个参数和第一个判断, 小于返回 0.0, 否则返回 1.0 |
| smoothstep() | float, float, float | float | 平滑阶跃, 第一个参数是下限, 第二个是上限, 第三个是判断的值, 如果小于下限返回 0, 大于上限2返回 1, 在中间, 返回 (x - 下限) / (上限 - 下限) |
| fract() | vec2/float | vec2/float | 返回小数部分 |

变量类型
| 变量名 | 类型 | 作用域 | 用途 |
|--------|------|--------|------|
| material | czm_material | 局部 | 最终材质对象 |
| materialInput | czm_materialInput | 输入 | 着色器输入参数 |
| st | vec2 | 局部 | 纹理坐标 |
| direction | vec2 | 局部 | 渐变方向向量 |
| gradient | float | 局部 | 渐变强度值 |
| uGradientDirection | uniform float | 全局 | 渐变方向角度 |
| uStartColor | uniform vec4 | 全局 | 起始颜色 |
| uEndColor | uniform vec4 | 全局 | 结束颜色 |
Cesium 特定
| 名称 | 类型 | 说明 |
|------|------|------|
| czm_material | 结构体 | Cesium材质结构 |
| czm_materialInput | 结构体 | Cesium材质输入 |
| czm_getDefaultMaterial() | 函数 | Cesium材质函数 |