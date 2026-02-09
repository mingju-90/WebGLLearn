
## shader 是什么
### 定义
shader(着色器)是运行在GPU上的小程序, 用来控制3D物体的顶点位置(顶点着色器)和像素颜色/透明度(片元着色器), Threejs 中的 ShaderMaterial 就是通过自定义这两段小程序, 实现比普通材质更灵活的视觉效果.

### Threejs 中 Shader 的基本结构
```js
// threejs 中 shader 的基本结构
new THREE.ShaderMaterial({
    uniforms: {},           // JS 传给 shader 的全局变量, 可以动态更新
    vertexShader: ``,       // 顶点着色器代码(控制顶点位置)
    fragmentShader: ``,     // 片元着色器代码(控制像素颜色)
    transparent: true,      // 开启透明(alpha 生效)
    depthWrite: false,      // 关闭深度写入(透明物体不遮挡)
})
```

### 关键术语
- uniforms:
    - JS 与 Shader 通信的桥梁, 全局变量, 给 Shader 传入的外部参数.

- varying:
    - 顶点着色器传入片元着色器的变量

- vertexShader:
    - 处理每个顶点的位置, 输出到片元着色器

- fragmentShader
    - 处理每个像素颜色/透明度

- gl_Position
    - 顶点着色器的核心输出, 定义顶点最终位置

- gl_FragColor
    - 片元着色器的核心输出, 定义像素最终颜色


## GLSL 核心函数整理
### 基础数学函数
| 函数名 | 语法 | 核心作用 | 经典场景 |
|- | - | - | - |
| abs | float abs(float x)<br> vec2/3/4 abs(vec x) | 获取绝对值 | 距离计算, 负数转正数 |
| sign | float sign(float x) <br> vec2/3/4 sign(vec x) | 返回富豪: x > 0 => 1, x < 0 => -1, x = 0 => 0 | 方向判断, 正负区分 |
| floor | float floor(float x) <br> vec2/3/4 floor(vec x) | 向下取整 | 网格/棋盘格, 整数化坐标 |