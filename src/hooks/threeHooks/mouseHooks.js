import { shallowRef, unref, onUnmounted } from 'vue';
import * as THREE from 'three';

/**
 * Three.js 鼠标拾取（射线检测）通用钩子
 * 支持监听指定鼠标事件，通过射线投射检测鼠标位置对应的3D对象，返回拾取到的顶层可交互对象
 * @param {Object} options - 配置项（整合所有参数，简化传参）
 * @param {THREE.WebGLRenderer | import('vue').Ref<THREE.WebGLRenderer>} options.renderer - Three.js 渲染器实例（支持响应式Ref包装）
 * @param {string} options.eventType - 监听的鼠标事件类型（如'click'/'mousemove'/'pointerdown'）
 * @param {THREE.Scene} options.scene - Three.js 场景实例（必传，用于射线检测和父对象查找）
 * @param {THREE.Camera | import('vue').Ref<THREE.Camera>} options.camera - Three.js 相机实例（必传，射线投射起点）
 * @param {(pickedObject: THREE.Object3D | null) => void} [options.onPick] - 拾取结果回调函数
 * @param {THREE.Object3D[]} [options.pickableObjects] - 可拾取对象列表（默认：scene.children）
 * @param {number} [options.throttleTime=0] - 节流时间（ms），0表示无节流
 * @returns {Object} 拾取控制器（结构化返回，语义更清晰）
 * @returns {() => void} returns.enable - 启动拾取（替代原startEvent）
 * @returns {() => void} returns.disable - 停止拾取（替代原stopEvent）
 * @returns {import('vue').ShallowRef<THREE.Object3D | null>} returns.pickedObject - 当前拾取的对象（响应式）
 * @returns {() => THREE.Object3D | null} returns.getPickedObject - 获取当前拾取对象（非响应式取值方法）
 * @example
 * // 基础使用
 * const picker = useThreeMousePick({
 *   renderer,
 *   eventType: 'click',
 *   scene,
 *   camera,
 *   pickableObjects: [modelGroup],
 *   onPick: (obj) => console.log('选中对象：', obj)
 * });
 * picker.enable();
 * 
 * // 响应式监听拾取结果
 * watch(picker.pickedObject, (newObj) => {
 *   // 处理选中/取消选中逻辑
 * });
 */
export const useThreeMousePick = ({
  renderer,
  eventType,
  scene,
  camera,
  onPick = () => {},
  pickableObjects = scene?.children || [],
  throttleTime = 0
}) => {
  // 响应式存储当前拾取的对象
  const pickedObject = shallowRef(null);

  // 核心射线检测实例
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  // 事件相关变量（私有化命名，避免外部误操作）
  let _eventHandler = null;
  let _throttleTimer = null;

  // 校验必传参数（提前拦截错误）
  if (!renderer || !eventType || !scene || !camera) {
    console.error('[useThreeMousePick] 必传参数缺失：renderer/eventType/scene/camera 不能为空');
    // 返回空控制器，避免调用报错
    return {
      enable: () => {},
      disable: () => {},
      pickedObject,
      getPickedObject: () => pickedObject.value
    };
  }

  /**
   * 核心拾取逻辑（私有化）
   * @param {MouseEvent | PointerEvent} event
   */
  const _handleMousePick = (event) => {
    const canvas = unref(renderer).domElement;
    const rect = canvas.getBoundingClientRect();

    // 屏幕坐标转Three.js标准设备坐标（NDC）
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // 更新射线并检测交点
    raycaster.setFromCamera(mouse, unref(camera));
    const intersects = raycaster.intersectObjects(pickableObjects, true);

    let targetObject = null;
    if (intersects.length > 0) {
      // 查找顶层可拾取父对象
      targetObject = _findTopPickableParent(intersects[0].object);
    }

    // 更新拾取状态并执行回调
    pickedObject.value = targetObject;
    onPick(targetObject);
  };

  /**
   * 递归查找顶层可拾取父对象
   * @param {THREE.Object3D} obj
   * @returns {THREE.Object3D | null}
   */
  const _findTopPickableParent = (obj) => {
    if (!obj || obj === scene) return obj;
    // 检查当前对象是否在可拾取列表中
    if (pickableObjects.some(item => item === obj)) return obj;
    // 递归向上查找
    return _findTopPickableParent(obj.parent);
  };

  /**
   * 节流包装函数
   * @param {MouseEvent | PointerEvent} event
   */
  const _wrappedHandler = (event) => {
    if (throttleTime <= 0) return _handleMousePick(event);
    clearTimeout(_throttleTimer);
    _throttleTimer = setTimeout(() => _handleMousePick(event), throttleTime);
  };

  // 对外暴露的核心方法（语义化命名）
  const enable = () => {
    if (_eventHandler) return; // 避免重复绑定
    _eventHandler = _wrappedHandler;
    unref(renderer).domElement.addEventListener(eventType, _eventHandler);
  };

  const disable = () => {
    if (!_eventHandler) return;
    // 解绑事件 + 清理定时器 + 重置状态
    unref(renderer).domElement.removeEventListener(eventType, _eventHandler);
    clearTimeout(_throttleTimer);
    _eventHandler = null;
    pickedObject.value = null;
  };

  // 辅助方法：非响应式获取当前拾取对象
  const getPickedObject = () => pickedObject.value;



  // 结构化返回（语义化 + 防篡改）
  return Object.freeze({
    enable,
    disable,
    pickedObject,
    getPickedObject
  });
};