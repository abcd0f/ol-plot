<template>
  <div class="map-container">
    <div ref="el" class="map-wrapper" />

    <MapToolbar
      color="#fa8c16"
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

import { PolygonTool } from '../../../packages';
import MapToolbar from '../components/MapToolbar.vue';

const el = ref<HTMLDivElement>();


let map: OlMap;
let tool: PolygonTool;

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

  tool = new PolygonTool(map, {
    strokeColor: '#52c41a',
    strokeWidth: 2,
    lineDash: [20, 10],
    fillColor: 'rgba(82,196,26,0.15)',
    nodeStyle: { radius: 5, fill: '#fff', stroke: '#52c41a', strokeWidth: 2 },
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
