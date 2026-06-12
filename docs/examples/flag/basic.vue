<template>
  <div class="map-container">
    <div ref="el" class="map-wrapper" />

    <MapToolbar color="#fa8c16" @clear="handleClear" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import OlMap from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import { fromLonLat } from 'ol/proj';

import { FlagTool } from '../../../packages/index.ts';
import MapToolbar from '../components/MapToolbar.vue';

const el = ref<HTMLDivElement>();

let map: OlMap;
let tool: FlagTool;

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

  tool = new FlagTool(map, {
    strokeColor: '#722ed1',
    strokeWidth: 2,
    fillColor: 'rgba(114,46,209,0.1)',
    nodeStyle: { radius: 5, fill: '#fff', stroke: '#722ed1', strokeWidth: 2 },
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
