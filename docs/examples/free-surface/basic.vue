<template>
  <div class="map-container">
    <div ref="el" class="map-wrapper" />

    <MapToolbar
      color="#13c2c2"
      hint="点击起点后移动预览 · 再次点击结束并闭合成面 · 点击要素切换编辑 · 点击空白取消选中"
      @clear="handleClear"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import OlMap from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import { fromLonLat } from 'ol/proj';

import { FreehandPolygonTool } from '@seedlib/ol-plot';
import MapToolbar from '../components/MapToolbar.vue';

const el = ref<HTMLDivElement>();

let map: OlMap;
let tool: FreehandPolygonTool;

onMounted(() => {
  map = new OlMap({
    target: el.value,
    layers: [
      new TileLayer({
        source: new XYZ({
          url: 'https://thematic.geoq.cn/arcgis/rest/services/ChinaOnlineStreetGray/MapServer/tile/{z}/{y}/{x}',
        }),
      }),
    ],
    view: new View({
      center: fromLonLat([116.3974, 39.9093]),
      zoom: 10,
    }),
  });

  tool = new FreehandPolygonTool(map, {
    strokeColor: '#13c2c2',
    strokeWidth: 2,
    fillColor: 'rgba(19, 194, 194, 0.18)',
    nodeStyle: { radius: 5, fill: '#fff', stroke: '#13c2c2', strokeWidth: 2 },
  });
});

onUnmounted(() => {
  tool.destroy();
  map.setTarget(undefined);
});

function handleClear() {
  tool.clearFeatures();
}
</script>

<style scoped>
.map-container {
  position: relative;
  width: 100%;
  font-size: 13px;
}

.map-wrapper {
  width: 100%;
  height: 500px;
}
</style>
