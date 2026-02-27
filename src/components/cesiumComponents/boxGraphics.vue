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
    dimensions: {
        type: Array,
        default: () => [100.0, 100.0, 100.0],
    },
    heightReference: {
        type: Number,
        default: Cesium.HeightReference.NONE,
    },
    fill: {
        type: Boolean,
        default: true,
    },
    material: {
        type: [String, Object],
        default: 'red',
    },
    outline: {
        type: Boolean,
        default: false,
    },
    outlineColor: {
        type: String,
        default: 'white',
    },
    outlineWidth: {
        type: Number,
        default: 1,
    },
    shadows: {
        type: Number,
        default: Cesium.ShadowMode.DISABLED,
    },
    distanceDisplayCondition: {
        type: Object,
        default: () => new Cesium.DistanceDisplayCondition(0.0, Number.POSITIVE_INFINITY),
    },
    // 定义props
})

const entityInstance = inject('entityInstance')

const initBox = () => {
    if (!entityInstance) return;
    
    entityInstance.box = {
       
        dimensions: new Cesium.Cartesian3(...props.dimensions),
        heightReference: props.heightReference, 
        show: props.show,
        fill: props.fill,
        material : Cesium.Color.GREENYELLOW.withAlpha(0.5),
        material: typeof props.material === 'string' ? Cesium.Color.fromCssColorString(props.material) : props.material,
        outline: props.outline,
        outlineColor: Cesium.Color.fromCssColorString(props.outlineColor),
        outlineWidth: props.outlineWidth,
        disableDepthTestDistance: props.disableDepthTestDistance,
        shadows: props.shadows,
        distanceDisplayCondition: props.distanceDisplayCondition,

    }
}

const stopWatch = watchEffect(() => {
    initBox()
})

// 生命周期
onMounted(() => {
  console.log('entityInstance', entityInstance)
})

onBeforeUnmount(() => {
    console.log('组件即将卸载，清理资源')
    if(entityInstance) entityInstance.box = undefined
    stopWatch()
})
</script>

<style scoped lang="scss">
.container {
  // 样式
}
</style>
