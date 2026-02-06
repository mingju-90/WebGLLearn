import * as THREE from 'three';

/**
 * 高精度定时器管理工具（基于 performance.now() 计时，不受系统时间影响）
 * 支持设置指定执行次数的定时器、动态清除单个定时器、批量清空所有定时器
 * @returns {Object} 定时器管理实例
 * @property {Function} interval - 添加定时器
 * @property {Function} clearIntervals - 清空所有定时器
 * @example
 * // 基础使用示例
 * const timer = useIntervalTime();
 * // 添加每200ms执行1次、共执行5次的定时器
 * const clearSingleTimer = timer.interval(() => {
 *   console.log('定时器执行');
 * }, 200, 5);
 * // 手动清除单个定时器：clearSingleTimer();
 * // 清空所有定时器：timer.clearIntervals();
 */
export const useIntervalTime = () => {
    /**
     * 定时器存储数组
     * @type {Array<{
     *   id: symbol,               // 定时器唯一标识（避免相同回调误删）
     *   callback: Function,       // 执行回调
     *   time: number,             // 执行间隔(ms)
     *   lastTime: number,         // 上次执行时间戳(performance.now())
     *   remainingIterations: number // 剩余执行次数
     * }>}
     */
    let intervals = []
    // 存储requestAnimationFrame的ID，用于停止循环
    let animationFrameId = null;

    /**
     * 添加高精度定时器
     * @param {Function} callback - 到期执行的回调函数
     * @param {number} time - 执行间隔（必须是大于0的数字）
     * @param {number} [iterations=Infinity] - 执行次数，默认无限次
     * @returns {Function} 清除当前定时器的函数（调用后立即失效）
     */
    const interval = (callback, time, iterations = Infinity) => {
        // 基础参数校验（避免无效调用）
        if (typeof callback !== 'function') throw new Error('callback 必须是函数');
        if (typeof time !== 'number' || time <= 0) throw new Error('time 必须是大于0的数字');
        if (typeof iterations !== 'number' || iterations < 1) throw new Error('iterations 必须是大于等于1的数字');

        // 生成唯一ID（解决相同callback误删问题）
        const timerId = Symbol('timer-id');
        intervals.push({
            id: timerId,
            callback,
            time,
            lastTime: 0, // 初始为0，首次执行用完整间隔
            remainingIterations: iterations
        });
        startLoop()

        // 返回清除当前定时器的函数（按唯一ID过滤，更精准）
        return () => {
            intervals = intervals.filter(item => item.id !== timerId);
        };
    };

    /**
     * 检查并执行所有到期的定时器（需主动调用，建议搭配requestAnimationFrame）
     * @returns {void}
     */
    const update = () => {
        if (!intervals.length) {
            // 无定时器时停止循环
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
            return;
        }
        const now = performance.now();

        // 遍历处理每个定时器
        intervals.forEach(item => {
            const deltaTime = now - item.lastTime;
            // 核心修复：原逻辑写反（deltaTime < time 时return → 应该是 >= 时执行）
            if (deltaTime < item.time) return;

            // 执行回调并更新剩余次数
            item.callback();
            item.remainingIterations--;

            // 未执行完则重置上次执行时间（保证下次间隔准确）
            if (item.remainingIterations > 0) {
                item.lastTime = now;
            }
        });

        // 过滤掉已执行完所有次数的定时器
        intervals = intervals.filter(item => item.remainingIterations > 0);
        // 继续循环（如果还有定时器，会在下一帧执行update）
        animationFrameId = requestAnimationFrame(update);
    };

    /**
     * 启动update循环（仅在未启动时执行）
     * @private
     */
    const startLoop = () => {
        if (!animationFrameId) {
            animationFrameId = requestAnimationFrame(update);
        }
    };

    /**
     * 清空所有定时器，立即停止所有未执行的回调
     * @returns {void}
     */
    const clearIntervals = () => {
        intervals.length = 0; // 原地清空数组，释放内存
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    };

    return {
        interval,
        clearIntervals
    };
};

/**
 * 提取 Three.js 中 Mesh（网格）对象的完整空间几何信息
 * 核心作用：一次性获取模型的「包围盒、尺寸、中心点、世界空间位置/朝向/旋转」等关键空间属性
 * @param {THREE.Mesh} mesh - Three.js 的 Mesh 网格对象（需是已添加到场景的有效模型）
 * @returns {Object} 包含模型所有核心空间信息的对象，各属性说明如下：
 * @returns {THREE.Vector3} return.size - 模型包围盒的尺寸（x=宽度, y=高度, z=深度，纯长度值，无正负）
 * @returns {THREE.Vector3} return.center - 模型包围盒的几何中心点（x/y/z 是空间坐标，有正负，代表中心位置）
 * @returns {THREE.Vector3} return.min - 包围盒最小点坐标（x/y/z 均为模型在对应轴的最小值）
 * @returns {THREE.Vector3} return.max - 包围盒最大点坐标（x/y/z 均为模型在对应轴的最大值）
 * @returns {THREE.Vector3} return.worldPosition - 模型在世界坐标系的绝对位置（不受父节点影响的真实位置）
 * @returns {THREE.Vector3} return.worldDirection - 模型在世界坐标系的正方向（默认指向模型本地 z 轴正方向）
 * @returns {THREE.Quaternion} return.worldQuaternion - 模型在世界坐标系的旋转四元数（比欧拉角更稳定，无万向锁问题）
 * @returns {THREE.Box3} return.box3 - 模型的完整轴对齐包围盒对象（可用于碰撞检测、范围判断等）
 * @example
 * // 使用示例：获取模型空间信息并打印中心点
 * const mesh = new THREE.Mesh(geometry, material);
 * const box3Info = getBox3Info(mesh);
 * console.log('模型中心坐标：', box3Info.center.x, box3Info.center.y, box3Info.center.z);
 * console.log('模型尺寸（宽高深）：', box3Info.size.x, box3Info.size.y, box3Info.size.z);
 */
export const getBox3Info = (mesh) => {
    // 1. 创建空的轴对齐包围盒（AABB）对象
    // 轴对齐包围盒：能完全包裹模型的最小长方体，且长方体的边与坐标系轴平行
    const box3 = new THREE.Box3();

    // 2. 计算并填充 mesh 的包围盒信息（核心步骤）
    // setFromObject 会自动遍历 mesh 及其子节点，计算出包裹所有顶点的最小/最大坐标
    // 新手注意：若 mesh 未添加到场景或无几何体，box3 会是无限大的无效值
    box3.setFromObject(mesh);

    // 3. 声明存储「尺寸」和「中心点」的 Vector3 容器（Three.js 要求必须用 Vector3 接收结果）
    // Vector3 是 Three.js 用于表示三维向量/坐标的核心对象，x/y/z 分别对应三维空间的三个轴
    const size = new THREE.Vector3(); // 存储包围盒尺寸（长宽高）
    const center = new THREE.Vector3(); // 存储包围盒几何中心点（坐标）

    // 4. 计算包围盒的几何中心点，结果写入 center 变量
    // 计算逻辑：(max.x+min.x)/2, (max.y+min.y)/2, (max.z+min.z)/2
    box3.getCenter(center);

    // 5. 计算包围盒的尺寸（长宽高），结果写入 size 变量
    // 计算逻辑：max.x-min.x（宽度）, max.y-min.y（高度）, max.z-min.z（深度）
    box3.getSize(size);

    // 6. 声明存储「世界空间变换信息」的容器
    // 世界坐标系：场景的根坐标系，区别于模型的「局部坐标系」（局部坐标受父节点位置/旋转影响）
    const worldQuaternion = new THREE.Quaternion(); // 存储世界空间旋转（四元数）
    const worldPosition = new THREE.Vector3(); // 存储世界空间位置（绝对坐标）
    const worldDirection = new THREE.Vector3(); // 存储世界空间朝向（正方向）

    // 7. 获取模型在世界坐标系的旋转（四元数）
    // 新手注意：mesh.quaternion 是局部旋转，getWorldQuaternion 是全局真实旋转
    mesh.getWorldQuaternion(worldQuaternion);

    // 8. 获取模型在世界坐标系的绝对位置
    // 新手注意：mesh.position 是局部位置，getWorldPosition 会计算父节点的变换，返回全局坐标
    mesh.getWorldPosition(worldPosition);

    // 9. 获取模型在世界坐标系的正方向（默认指向本地 z 轴正方向）
    // 用途：判断模型朝向（比如角色是否面向目标、模型是否朝东/北）
    mesh.getWorldDirection(worldDirection);

    // 10. 返回所有空间信息，方便外部调用
    return {
        size, // 模型尺寸（长宽高）
        center, // 包围盒中心点（坐标）
        min: box3.min, // 包围盒最小点坐标
        max: box3.max, // 包围盒最大点坐标
        worldPosition, // 世界空间绝对位置
        worldDirection, // 世界空间朝向
        worldQuaternion, // 世界空间旋转（四元数）
        box3 // 完整包围盒对象（可用于后续碰撞检测、范围判断）
    };
};
