<template>

</template>

<script setup>
import * as Cesium from 'cesium';
import { ref, reactive, computed, onMounted, inject, watchEffect, onBeforeUnmount } from 'vue'

const props = defineProps({
    show: {
        type: Boolean,
        default: true,
    },
    pixelSize: {
        type: Number,
        default: 10,
    },
    heightReference: {
        type: Number,
        default: Cesium.HeightReference.NONE,
    },
    color: {
        type: String,
        default: 'red',
    },
    outlineColor: {
        type: String,
        default: 'white',
    },
    outlineWidth: {
        type: Number,
        default: 0,
    },
    disableDepthTestDistance: {
        type: Number,
        default: Number.POSITIVE_INFINITY,
    },
    // 定义props
})

const entityInstance = inject('entityInstance')

const initPoint = () => {
    if (!entityInstance) return;
    entityInstance.point = {
        pixelSize: props.pixelSize,
        color: Cesium.Color.fromCssColorString(props.color),
        heightReference: props.heightReference, 
        show: props.show,
        outlineColor: Cesium.Color.fromCssColorString(props.outlineColor),
        outlineWidth: props.outlineWidth,
        disableDepthTestDistance: props.disableDepthTestDistance,

    }
}

const stopWatch = watchEffect(() => {
    initPoint()
})

// 生命周期
onMounted(() => {
  console.log('entityInstance', entityInstance)
})

onBeforeUnmount(() => {
    console.log('组件即将卸载，清理资源')
    if(entityInstance) entityInstance.point = undefined
    stopWatch()
})
</script>

<style scoped lang="scss">
.container {
  // 样式
}
</style>
