<template>
  <div class="map-container">
    <div ref="el" class="map-wrapper" />

    <MapToolbar color="#00b96b" @clear="handleClear" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import OlMap from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import { fromLonLat } from 'ol/proj';

import { FlowLineTool } from '@seedlib/ol-plot';
import MapToolbar from '../components/MapToolbar.vue';

const el = ref<HTMLDivElement>();

let map: OlMap;
let tool: FlowLineTool;

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

  tool = new FlowLineTool(map, {
    strokeColor: '#00b96b',
    strokeWidth: 10,
    flowLine: {
      arrowColor: '#ffffff',
      arrowSpacing: 52,
      speed: 72,
    },
    nodeStyle: { radius: 5, fill: '#fff', stroke: '#00b96b', strokeWidth: 2 },
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
