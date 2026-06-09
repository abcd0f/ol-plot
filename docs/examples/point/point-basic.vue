<template>
  <div class="map-container">
    <div ref="el" class="map-wrapper" />

    <MapToolbar :mode="mode" color="#52c41a" @draw="toggleDraw" @edit="toggleEdit" @clear="handleClear" />

    <div v-if="mode === 'draw'" class="status-tip">单击地图放置点</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import OlMap from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import { fromLonLat } from 'ol/proj';

import { PointTool } from '../../../packages';
import MapToolbar from '../components/MapToolbar.vue';

const el = ref<HTMLDivElement>();
const mode = ref<'draw' | 'edit' | 'idle'>('idle');

let map: OlMap;
let tool: PointTool;

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

  tool = new PointTool(map, {
    strokeColor: '#52c41a',
    strokeWidth: 2,
    fillColor: 'rgba(82,196,26,0.2)',
    nodeStyle: { radius: 6, fill: '#fff', stroke: '#52c41a', strokeWidth: 2 },
  });
});

onUnmounted(() => {
  tool.destroy();
  map.setTarget(undefined);
});

function toggleDraw() {
  if (mode.value === 'draw') {
    tool.deactivate();
    mode.value = 'idle';
  } else {
    tool.activate();
    mode.value = 'draw';
  }
}

function toggleEdit() {
  if (mode.value === 'edit') {
    tool.deactivate();
    mode.value = 'idle';
  } else {
    tool.deactivate();
    mode.value = 'edit';
  }
}

function handleClear() {
  tool.clearFeatures();
  mode.value = 'idle';
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

.status-tip {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  padding: 5px 14px;
  color: #fff;
  background: rgba(0, 0, 0, 0.55);
  border-radius: 20px;
  pointer-events: none;
  z-index: 10;
}
</style>
