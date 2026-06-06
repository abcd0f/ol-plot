<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import { fromLonLat } from 'ol/proj';

import { LineTool, LINE_DASH, LineCap } from '../../../src';

const el = ref<HTMLDivElement>();

let map: Map;
let tool: LineTool;

onMounted(() => {
  map = createMap();

  tool = new LineTool(map, {
    stroke: {
      color: '#722ed1',
      width: 3,
      lineDash: LINE_DASH.DOTTED,
      lineCap: LineCap.ROUND,
    },
  });

  tool.activate();
});

onUnmounted(() => {
  tool.destroy();
  map.setTarget(undefined);
});

function createMap() {
  return new Map({
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
}
</script>

<template>
  <div ref="el" class="map-wrapper" />
</template>

<style scoped>
.map-wrapper {
  width: 100%;
  height: 500px;
}
</style>
