<template>
  <div class="map-wrapper" ref="el" />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import { fromLonLat } from 'ol/proj';

import { LineTool, DrawEvent } from '../../../packages';

const el = ref<HTMLDivElement>();

let map: Map;
let lineTool: LineTool;

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
      center: fromLonLat([116.3974, 39.9093]),
      zoom: 10,
    }),
  });

  lineTool = new LineTool(map);

  lineTool
    .on(DrawEvent.DRAW_START, () => {
      console.log('开始绘制');
    })
    .on(DrawEvent.DRAW_END, ({ feature }) => {
      console.log('绘制完成', feature);
    })
    .on(DrawEvent.MODIFY_START, () => {
      console.log('开始编辑节点');
    })
    .on(DrawEvent.MODIFY_END, ({ features }) => {
      console.log('编辑完成', features);
    });
});

onUnmounted(() => {
  lineTool.destroy();
  map.setTarget(undefined);
});
</script>

<style scoped>
.map-wrapper {
  width: 100%;
  height: 500px;
}
</style>
