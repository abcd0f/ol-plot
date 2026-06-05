<template>
  <div ref="el" class="map-wrapper"></div>
  <div class="controls">
    <button @click="addLine">添加线</button>
    <button @click="toggleLine">切换选中</button>
    <button @click="removeLine">删除线</button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import XYZ from 'ol/source/XYZ';
import { fromLonLat } from 'ol/proj';
import { LineString } from 'ol/geom';
import Feature from 'ol/Feature';
import { Style, Stroke } from 'ol/style';

import { createLine, updateLineConfig, LineInteraction, LINE_STYLES, PREDEFINED_COLORS } from '../../../dist/index.mjs';
import type { Line } from '../../../dist/index.mjs';

const el = ref<HTMLDivElement>();
let map: Map | null = null;
let vectorLayer: VectorLayer<VectorSource> | null = null;
let currentLine: Line | null = null;
let currentInteraction: LineInteraction | null = null;
let currentFeature: Feature<LineString> | null = null;

onMounted(() => {
  vectorLayer = new VectorLayer({ source: new VectorSource() });

  map = new Map({
    target: el.value,
    layers: [
      new TileLayer({
        source: new XYZ({
          url: '/seamap/seaMap/{z}/{y}/{x}.png',
        }),
      }),
      vectorLayer,
    ],
    view: new View({
      center: fromLonLat([116.3974, 39.9093]),
      zoom: 10,
    }),
  });
});

onUnmounted(() => {
  map?.setTarget(undefined);
});

function addLine() {
  const coords = [
    [116.3, 39.8],
    [116.4, 39.9],
    [116.5, 39.85],
  ];
  const projected = coords.map((c) => fromLonLat(c));

  currentLine = createLine('route', coords, {
    color: PREDEFINED_COLORS.RED,
    width: 3,
    dashPattern: LINE_STYLES.SOLID,
    name: '示例路线',
  });

  currentInteraction = new LineInteraction(currentLine);
  currentInteraction.activate();

  currentFeature = new Feature({
    geometry: new LineString(projected),
  });
  currentFeature.setStyle(
    new Style({
      stroke: new Stroke({
        color: currentLine.config.color,
        width: currentLine.config.width,
      }),
    }),
  );

  vectorLayer?.getSource()?.addFeature(currentFeature);

  updateLineConfig(currentLine, { name: '已激活路线' });
}

function toggleLine() {
  if (!currentInteraction) return;
  if (currentInteraction.getState().selected) {
    currentInteraction.deselect();
    currentFeature?.setStyle(
      new Style({
        stroke: new Stroke({ color: PREDEFINED_COLORS.RED, width: 3 }),
      }),
    );
  } else {
    currentInteraction.select();
    currentFeature?.setStyle(
      new Style({
        stroke: new Stroke({ color: PREDEFINED_COLORS.BLUE, width: 5 }),
      }),
    );
  }
}

function removeLine() {
  if (currentFeature) {
    vectorLayer?.getSource()?.removeFeature(currentFeature);
    currentFeature = null;
  }
  currentInteraction?.delete();
  currentLine = null;
  currentInteraction = null;
}
</script>

<style scoped>
.map-wrapper {
  width: 100%;
  height: 400px;
}
.controls {
  margin-top: 8px;
  display: flex;
  gap: 8px;
}
.controls button {
  padding: 4px 12px;
  cursor: pointer;
}
</style>
