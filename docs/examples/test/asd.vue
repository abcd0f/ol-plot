<template>
  <div ref="el" class="map-wrapper"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import { fromLonLat } from 'ol/proj';

const el = ref<HTMLDivElement>();
let map: Map | null = null;

onMounted(() => {
  map = new Map({
    target: el.value,
    layers: [
      new TileLayer({
        source: new XYZ({
          url: 'https://thematic.geoq.cn/arcgis/rest/services/ChinaOnlineStreetGray/MapServer/tile/{z}/{y}/{x}',
        }),
      }),
    ],
    view: new View({
      center: fromLonLat([116.3974, 39.9093]), // 北京
      zoom: 10,
    }),
  });
});

onUnmounted(() => {
  map?.setTarget(undefined);
});
</script>

<style scoped>
.map-wrapper {
  width: 100%;
  height: 300px;
}
</style>
