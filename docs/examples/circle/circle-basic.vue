<template>
  <div class="map-container">
    <div ref="el" class="map-wrapper" />

    <div class="toolbar">
      <button :class="['toolbar-btn', { active: isDrawing }]" @click="toggleDraw">
        {{ isDrawing ? '停止绘制' : '开始绘制' }}
      </button>
      <div class="toolbar-divider" />
      <button class="toolbar-btn danger" @click="handleClear">清空</button>
    </div>

    <div v-if="isDrawing" class="status-tip">单击确定圆心，再次单击确定半径</div>

    <div class="info-panel">
      <div class="info-row">
        <span class="info-label">要素数</span>
        <span class="info-value">{{ featureCount }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">半径</span>
        <span class="info-value">{{ radiusText }}</span>
      </div>
      <div class="log-title">事件日志</div>
      <div class="log-list">
        <div v-for="(log, i) in logs" :key="i" class="log-item">
          <span :class="['log-tag', `log-tag--${log.type}`]">{{ log.label }}</span>
          <span class="log-msg">{{ log.msg }}</span>
        </div>
        <div v-if="!logs.length" class="log-empty">暂无事件</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import OlMap from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import { fromLonLat, toLonLat } from 'ol/proj';
import type OlCircle from 'ol/geom/Circle';

import { CircleTool, DrawEvent } from '../../../packages';

const el = ref<HTMLDivElement>();
const isDrawing = ref(false);
const featureCount = ref(0);
const radiusText = ref('—');

interface LogItem {
  type: 'start' | 'end' | 'select' | 'modify';
  label: string;
  msg: string;
}
const logs = ref<LogItem[]>([]);
function addLog(item: LogItem) {
  logs.value.unshift(item);
  if (logs.value.length > 8) logs.value.pop();
}

function formatRadius(r: number): string {
  return r > 1000 ? `${(r / 1000).toFixed(2)} km` : `${r.toFixed(0)} m`;
}

function updateRadius(geom: OlCircle) {
  radiusText.value = formatRadius(geom.getRadius());
}

let map: OlMap;
let tool: CircleTool;

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

  tool = new CircleTool(map);

  tool
    .on(DrawEvent.DRAW_START, () => {
      addLog({ type: 'start', label: '开始', msg: '开始绘制圆' });
    })
    .on(DrawEvent.DRAW_END, ({ feature }) => {
      isDrawing.value = false;
    })
    .on(DrawEvent.SELECT, ({ feature }) => {})
    .on(DrawEvent.DESELECT, () => {})
    .on(DrawEvent.MODIFY_END, ({ features }) => {});
});

onUnmounted(() => {
  tool.destroy();
  map.setTarget(undefined);
});

function toggleDraw() {
  if (isDrawing.value) {
    tool.deactivate();
    isDrawing.value = false;
  } else {
    tool.activate();
    isDrawing.value = true;
  }
}

function handleClear() {
  tool.clearFeatures();
  isDrawing.value = false;
  featureCount.value = 0;
  radiusText.value = '—';
  logs.value = [];
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

.toolbar {
  position: absolute;
  top: 12px;
  left: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12);
  z-index: 10;
}
.toolbar-btn {
  padding: 4px 12px;
  color: #333;
  background: transparent;
  border: 1px solid #d9d9d9;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  user-select: none;
}
.toolbar-btn:hover {
  color: #722ed1;
  border-color: #722ed1;
  background: #f9f0ff;
}
.toolbar-btn.active {
  color: #fff;
  background: #722ed1;
  border-color: #722ed1;
}
.toolbar-btn.danger {
  color: #ff4d4f;
  border-color: #ffccc7;
}
.toolbar-btn.danger:hover {
  color: #fff;
  background: #ff4d4f;
  border-color: #ff4d4f;
}
.toolbar-divider {
  width: 1px;
  height: 18px;
  background: #e8e8e8;
  margin: 0 2px;
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

.info-panel {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 200px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12);
  z-index: 10;
}
.info-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}
.info-label {
  color: #999;
}
.info-value {
  font-weight: 600;
  color: #333;
}
.log-title {
  margin: 8px 0 4px;
  color: #999;
  border-top: 1px solid #f0f0f0;
  padding-top: 8px;
}
.log-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.log-item {
  display: flex;
  align-items: center;
  gap: 6px;
  line-height: 1.4;
}
.log-tag {
  flex-shrink: 0;
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 11px;
  color: #fff;
}
.log-tag--start {
  background: #722ed1;
}
.log-tag--end {
  background: #531dab;
}
.log-tag--select {
  background: #faad14;
}
.log-tag--modify {
  background: #1890ff;
}
.log-msg {
  color: #555;
  font-size: 12px;
}
.log-empty {
  color: #bbb;
  font-size: 12px;
}
</style>
