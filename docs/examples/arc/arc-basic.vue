<template>
  <div class="map-container">
    <div ref="el" class="map-wrapper" />

    <MapToolbar
      color="#13c2c2"
      hint="依次点击三点绘制弓形 · 完成后自动进入编辑 · 点击要素切换编辑 · 点击空白取消选中"
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

import { ArcTool } from '../../../packages';
import MapToolbar from '../components/MapToolbar.vue';

const el = ref<HTMLDivElement>();

let map: OlMap;
let tool: ArcTool;

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
    view: new View({ center: fromLonLat([116.3974, 39.9093]), zoom: 10 }),
  });

  tool = new ArcTool(map, {
    strokeColor: '#13c2c2',
    strokeWidth: 3,
    lineDash: [6, 3],
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
