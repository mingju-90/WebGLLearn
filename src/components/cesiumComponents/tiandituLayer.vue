<template>
    <div></div>
</template>

<script setup>
import * as Cesium from 'cesium';
import {  onBeforeUnmount, watch, watchEffect } from 'vue'
const props = defineProps({
    // 图层类型：vec(矢量底图)、cva(矢量注记)、img(影像底图)、cia(影像注记)
    type: {
        required: true,
        validator: (value) => ['vec', 'cva', 'img', 'cia'].includes(value),
        default: 'vec'
    },
    viewer: {
        required: true,
        type: Object
    }
})
const TDT_KEY = '0387f2eabe7fbbe6ba8d86f2c2b2f2b7';


let imageryLayer = null

const tdtLayers = {
    // 矢量底图
    vec: {
        url: "https://t{s}.tianditu.gov.cn/vec_w/wmts?service=WMTS&request=GetTile&version=1.0.0&LAYER=vec&style=default&tileMatrixSet=w&TileMatrix={TileMatrix}&TileRow={TileRow}&TileCol={TileCol}&format=tiles&tk=" + TDT_KEY,
        layer: "tdtVecLayer",
        style: "default",
        format: "image/jpeg",
        tileMatrixSetID: "GoogleMapsCompatible"
    },
    // 矢量注记
    cva: {
        url: "https://t{s}.tianditu.gov.cn/cva_w/wmts?service=WMTS&request=GetTile&version=1.0.0&LAYER=cva&style=default&tileMatrixSet=w&TileMatrix={TileMatrix}&TileRow={TileRow}&TileCol={TileCol}&format=tiles&tk=" + TDT_KEY,
        layer: "tdtCvaLayer",
        style: "default",
        format: "image/png",
        tileMatrixSetID: "GoogleMapsCompatible"
    },
    // 影像底图
    img: {
        url: "https://t{s}.tianditu.gov.cn/img_w/wmts?service=WMTS&request=GetTile&version=1.0.0&LAYER=img&style=default&tileMatrixSet=w&TileMatrix={TileMatrix}&TileRow={TileRow}&TileCol={TileCol}&format=tiles&tk=" + TDT_KEY,
        layer: "tdtImgLayer",
        style: "default",
        format: "image/jpeg",
        tileMatrixSetID: "GoogleMapsCompatible"
    },
    // 影像注记
    cia: {
        url: "https://t{s}.tianditu.gov.cn/cia_w/wmts?service=WMTS&request=GetTile&version=1.0.0&LAYER=cia&style=default&tileMatrixSet=w&TileMatrix={TileMatrix}&TileRow={TileRow}&TileCol={TileCol}&format=tiles&tk=" + TDT_KEY,
        layer: "tdtCiaLayer",
        style: "default",
        format: "image/png",
        tileMatrixSetID: "GoogleMapsCompatible"
    }
};


const removeLayer = () => {
    if (!imageryLayer || !props.viewer.imageryLayers?.length) return
    if (!props.viewer.imageryLayers._layers.some(item => item === imageryLayer)) return console.error('没有对应图层')
    props.viewer.imageryLayers.remove(imageryLayer)
    imageryLayer = null
}

const loadLayer = (type) => {
    const layerConfig = tdtLayers[type];
    if (!layerConfig) {
        console.error("无效的天地图图层类型：", type);
        return;
    }

    const tdtLayer = new Cesium.WebMapTileServiceImageryProvider({
        url: layerConfig.url,
        layer: layerConfig.layer,
        style: layerConfig.style,
        format: layerConfig.format,
        tileMatrixSetID: layerConfig.tileMatrixSetID,
        // 天地图的子域名，用于负载均衡
        subdomains: ["0", "1", "2", "3", "4", "5", "6", "7"],
        // 解决跨域问题（如果需要）
        credit: new Cesium.Credit("天地图")
    });

    // 将图层添加到viewer
    imageryLayer = props.viewer.imageryLayers.addImageryProvider(tdtLayer);
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
    loadLayer(props.type)
    // if (props.type === 'satellite') loadSatellite()
    // else if (props.type === 'annotation') loadAnnotation()
}



watchEffect(() => {
    removeLayer()
    loadMap()
})

onBeforeUnmount(() => {
    removeLayer()
})
</script>