<template>
    <div></div>
</template>

<script setup>
import * as Cesium from 'cesium';
import {  onBeforeUnmount, watch, watchEffect } from 'vue'
const props = defineProps({
    // 图层类型：satellite(卫星影像)、annotation(注记)
    type: {
        required: true,
        validator: (value) => ['satellite', 'annotation'].includes(value),
        default: 'satellite'
    },
    viewer: {
        required: true,
        type: Object
    }
})
const webKey = '0387f2eabe7fbbe6ba8d86f2c2b2f2b7';


let imageryLayer = null


const removeLayer = () => {
    if (!imageryLayer || !props.viewer.imageryLayers?.length) return
    if (!props.viewer.imageryLayers._layers.some(item => item === imageryLayer)) return console.error('没有对应图层')
    props.viewer.imageryLayers.remove(imageryLayer)
    imageryLayer = null
}
const loadSatellite = () => {
    removeLayer()
    let tdtUrl = 'https://t{s}.tianditu.gov.cn/';
    let subdomains = ['0', '1', '2', '3', '4', '5', '6', '7'];

    //影像底图
    const t = new Cesium.UrlTemplateImageryProvider({
        url: tdtUrl + 'DataServer?T=img_w&x={x}&y={y}&l={z}&tk=' + webKey,
        tilingScheme: new Cesium.WebMercatorTilingScheme(),
        subdomains: subdomains,
        maximumLevel: 18
    });
    imageryLayer = props.viewer.imageryLayers.addImageryProvider(t);
}

const loadAnnotation = () => {
    removeLayer()
    const t = new Cesium.WebMapTileServiceImageryProvider({
        url: 'http://t0.tianditu.gov.cn/cva_w/wmts?tk=' + webKey,
        layer: 'cva', // 注记图层
        style: 'default',
        format: 'tiles',
        tileMatrixSetID: 'w',
        maximumLevel: 18 // 最大层级
    });
    imageryLayer = props.viewer.imageryLayers.addImageryProvider(t);
   
}


const loadMap = () => {
    if (props.type === 'satellite') loadSatellite()
    else if (props.type === 'annotation') loadAnnotation()
}



watchEffect(() => {
    removeLayer()
    loadMap()
})

onBeforeUnmount(() => {
    removeLayer()
})
</script>