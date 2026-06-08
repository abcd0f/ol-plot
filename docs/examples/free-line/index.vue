<template>
  <div class="map-container">
    <div ref="el" class="map-wrapper" />

    <!-- 工具栏 -->
    <div class="toolbar">
      <button :class="['toolbar-btn', { active: isDrawing }]" @click="toggleDraw">
        {{ isDrawing ? '停止绘制' : '开始绘制' }}
      </button>
      <div class="toolbar-divider" />
      <button class="toolbar-btn danger" @click="handleClear">清空</button>
    </div>

    <!-- 操作提示 -->
    <div v-if="isDrawing" class="status-tip">按住鼠标拖动绘制，松开完成</div>

    <!-- 信息面板 -->
    <div class="info-panel">
      <div class="info-row">
        <span class="info-label">要素数</span>
        <span class="info-value">{{ featureCount }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">节点数</span>
        <span class="info-value">{{ pointCount }}</span>
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
import type LineString from 'ol/geom/LineString';

import { FreehandLineTool, DrawEvent } from '../../../packages';

// ─── 状态 ────────────────────────────────────────────────────────────────────

const el = ref<HTMLDivElement>();
const isDrawing = ref(false);
const featureCount = ref(0);
const pointCount = ref(0);

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

// ─── OL + 工具实例 ────────────────────────────────────────────────────────────

let map: OlMap;
let tool: FreehandLineTool;

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

  tool = new FreehandLineTool(map, {
    strokeColor: '#1890ff',
    strokeWidth: 2,
    fillColor: 'rgba(24,144,255,0.1)',
    nodeStyle: { radius: 5, fill: '#fff', stroke: '#1890ff', strokeWidth: 2 },
  });

  tool
    .on(DrawEvent.DRAW_START, () => {
      addLog({ type: 'start', label: '开始', msg: '开始绘制自由线' });
    })
    .on(DrawEvent.DRAW_END, ({ feature }) => {
      isDrawing.value = false;
      featureCount.value = tool.getFeatures().length;
      const coords = (feature.getGeometry() as LineString).getCoordinates();
      pointCount.value = coords.length;
      const lonlat = toLonLat(coords[coords.length - 1]).map((v) => v.toFixed(4));
      addLog({ type: 'end', label: '完成', msg: `${coords.length} 个节点，终点 [${lonlat}]` });
    })
    .on(DrawEvent.SELECT, ({ feature }) => {
      const coords = (feature.getGeometry() as LineString).getCoordinates();
      pointCount.value = coords.length;
      addLog({ type: 'select', label: '选中', msg: `${coords.length} 个节点` });
    })
    .on(DrawEvent.DESELECT, () => {
      pointCount.value = 0;
      addLog({ type: 'select', label: '取消', msg: '取消选中' });
    })
    .on(DrawEvent.MODIFY_END, ({ features }) => {
      const coords = (features[0].getGeometry() as LineString).getCoordinates();
      pointCount.value = coords.length;
      addLog({ type: 'modify', label: '编辑', msg: `节点更新，共 ${coords.length} 个` });
    });
});

onUnmounted(() => {
  tool.destroy();
  map.setTarget(undefined);
});

// ─── 操作 ─────────────────────────────────────────────────────────────────────

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
  pointCount.value = 0;
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

/* 工具栏 */
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
  color: #1890ff;
  border-color: #1890ff;
  background: #e6f4ff;
}
.toolbar-btn.active {
  color: #fff;
  background: #1890ff;
  border-color: #1890ff;
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

/* 操作提示 */
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

/* 信息面板 */
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
  background: #52c41a;
}
.log-tag--end {
  background: #1890ff;
}
.log-tag--select {
  background: #faad14;
}
.log-tag--modify {
  background: #722ed1;
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
