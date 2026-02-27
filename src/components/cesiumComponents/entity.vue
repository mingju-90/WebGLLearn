<template>
    <slot v-if="entityInstance"></slot>
</template>

<script setup>
import * as Cesium from 'cesium';
import { ref, reactive, computed, onMounted, shallowRef, provide, onBeforeUnmount } from 'vue'

// Props 定义
const props = defineProps({
    viewer: {
        type: Object,
        required: true,
    },
    /** [lng, lat, height] */
    position: {
        type: Array,
        // default: () => []
    }
})

// 组件内部状态
const entityInstance = shallowRef(null)



const initEntity = () => {
    entityInstance.value = new Cesium.Entity({
        position: props.position && Cesium.Cartesian3.fromDegrees(...props.position),
    })
    props.viewer.entities.add(entityInstance.value)
}
initEntity()

const removeEntity = () => {
    if (entityInstance.value) {
        props.viewer.entities.remove(entityInstance.value)
        entityInstance.value = null
    }
}
provide('entityInstance', entityInstance.value)
// 生命周期
onMounted(() => {
    console.log('组件挂载完成')
})
onBeforeUnmount(() => {
    console.log('组件即将卸载，清理资源')
    removeEntity()
})
</script>

<style scoped lang="scss">
.container {
    // 样式
}
</style>
