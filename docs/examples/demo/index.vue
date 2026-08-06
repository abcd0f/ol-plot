<template>
  <div class="map-container">
    <div class="toolbar">
      <div class="tool-grid">
        <button
          v-for="tool in tools"
          :key="tool.type"
          class="tool-btn"
          :class="{ active: activeType === tool.type }"
          type="button"
          @click="selectTool(tool.type)"
        >
          {{ tool.label }}
        </button>
      </div>

      <div class="actions">
        <button class="action-btn" type="button" @click="deactivateTool">停用</button>
        <button class="action-btn" type="button" @click="exportData">导出</button>
        <button class="action-btn danger" type="button" @click="clearPlot">清空</button>
      </div>
    </div>

    <div class="status-panel">
      <div class="status-row">
        <span>当前工具</span>
        <strong>{{ activeLabel }}</strong>
      </div>
      <div class="status-row">
        <span>要素数量</span>
        <strong>{{ featureCount }}</strong>
      </div>
      <div class="status-row">
        <span>最近事件</span>
        <strong>{{ lastEvent }}</strong>
      </div>
    </div>

    <div ref="el" class="map-wrapper" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import OlMap from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import { fromLonLat } from 'ol/proj';
import { DrawEvent, DrawType, PlotManager } from '@seedlib/ol-plot';
import type { PlotDrawType } from '@seedlib/ol-plot';

interface ToolItem {
  label: string;
  type: PlotDrawType;
}

const tools: ToolItem[] = [
  { label: '点', type: DrawType.Point },
  { label: '图片点', type: DrawType.ImagePoint },
  { label: '折线', type: DrawType.Line },
  { label: '流向线', type: DrawType.FlowLine },
  { label: '自由线', type: DrawType.FreehandLine },
  { label: '多边形', type: DrawType.Polygon },
  { label: '矩形', type: DrawType.Rectangle },
  { label: '圆', type: DrawType.Circle },
  { label: '椭圆', type: DrawType.Ellipse },
  { label: '扇形', type: DrawType.Sector },
  { label: '直箭头', type: DrawType.StraightArrow },
  { label: '渐缩箭头', type: DrawType.TaperedArrow },
  { label: '线箭头', type: DrawType.LineArrow },
  { label: '双箭头', type: DrawType.DoubleArrow },
  { label: '弧线', type: DrawType.Arc },
  { label: '旗标', type: DrawType.Flag },
  { label: '测距', type: DrawType.Measure },
  { label: '测面', type: DrawType.AreaMeasure },
];

const markerSvg = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
  <path fill="#ff4d4f" d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 26 18 26s18-12.5 18-26C36 8.06 27.94 0 18 0z"/>
  <circle cx="18" cy="18" r="7" fill="#fff"/>
</svg>
`);

const el = ref<HTMLDivElement>();
const activeType = ref<PlotDrawType | null>(DrawType.Point);
const featureCount = ref(0);
const lastEvent = ref('未开始');

let map: OlMap | null = null;
let plot: PlotManager | null = null;

const activeLabel = computed(() => {
  if (!activeType.value) return '无';
  return tools.find((tool) => tool.type === activeType.value)?.label ?? String(activeType.value);
});

function refreshFeatureCount(): void {
  featureCount.value = plot?.getFeatures().length ?? 0;
}

function selectTool(type: PlotDrawType): void {
  activeType.value = type;
  plot?.setActiveTool(type);
}

function deactivateTool(): void {
  activeType.value = null;
  plot?.setActiveTool(null);
}

function clearPlot(): void {
  plot?.clearFeatures();
  lastEvent.value = '清空';
  refreshFeatureCount();
}

function exportData(): void {
  const data = plot?.getPlotData() ?? [];
  lastEvent.value = `导出 ${data.length} 个`;
  console.log('ol-plot data:', data);
}

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

  plot = new PlotManager(map, {
    strokeColor: '#1677ff',
    strokeWidth: 30,
    fillColor: 'rgba(22, 119, 255, 0.16)',
    nodeStyle: {
      radius: 6,
      fill: '#ffffff',
      stroke: '#1677ff',
      strokeWidth: 2,
    },
    image: {
      src: `data:image/svg+xml,${markerSvg}`,
      scale: 0.8,
      anchor: [0.5, 1],
    },
    flowLine: {
      arrowColor: '#00b96b',
      arrowSpacing: 56,
      speed: 72,
    },
    measure: {
      mode: 'both',
      unit: 'auto',
    },
  });

  //   plot.loadPlotData([
  //     {
  //       type: 'ImagePoint',
  //       plotType: 'imagePoint',
  //       coordinates: [[115.92361459960934, 39.959318129602366]],
  //       controlPoints: [[115.92361459960934, 39.959318129602366]],
  //       style: {
  //         strokeColor: '#1677ff',
  //         strokeWidth: 3,
  //         fillColor: 'rgba(22, 119, 255, 0.16)',
  //         lineDash: [],
  //         nodeStyle: {
  //           radius: 6,
  //           fill: '#ffffff',
  //           stroke: '#1677ff',
  //           strokeWidth: 2,
  //         },
  //         image: {
  //           src: 'data:image/svg+xml,%0A%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2236%22%20height%3D%2244%22%20viewBox%3D%220%200%2036%2044%22%3E%0A%20%20%3Cpath%20fill%3D%22%23ff4d4f%22%20d%3D%22M18%200C8.06%200%200%208.06%200%2018c0%2013.5%2018%2026%2018%2026s18-12.5%2018-26C36%208.06%2027.94%200%2018%200z%22%2F%3E%0A%20%20%3Ccircle%20cx%3D%2218%22%20cy%3D%2218%22%20r%3D%227%22%20fill%3D%22%23fff%22%2F%3E%0A%3C%2Fsvg%3E%0A',
  //           scale: 0.8,
  //           anchor: [0.5, 1],
  //           opacity: 1,
  //         },
  //       },
  //       properties: {},
  //     },
  //     {
  //       type: 'FlowLine',
  //       plotType: 'flowLine',
  //       coordinates: [
  //         [116.24359140624998, 40.01718818364225],
  //         [117.07168588867187, 40.003514231779576],
  //         [116.30232600661053, 39.711929884273275],
  //       ],
  //       controlPoints: [
  //         [116.24359140624998, 40.01718818364225],
  //         [117.07168588867187, 40.003514231779576],
  //         [116.30232600661053, 39.711929884273275],
  //       ],
  //       style: {
  //         strokeColor: '#1677ff',
  //         strokeWidth: 3,
  //         fillColor: 'rgba(22, 119, 255, 0.16)',
  //         lineDash: [],
  //         nodeStyle: {
  //           radius: 6,
  //           fill: '#ffffff',
  //           stroke: '#1677ff',
  //           strokeWidth: 2,
  //         },
  //         flowLine: {
  //           arrowColor: '#00b96b',
  //           arrowSpacing: 56,
  //           speed: 72,
  //         },
  //       },
  //       properties: {},
  //     },
  //   ]);

  plot.setActiveTool(activeType.value);

  plot.on(DrawEvent.DRAW_END, ({ data }) => {
    lastEvent.value = `绘制 ${data.type}`;
    refreshFeatureCount();
  });
  plot.on(DrawEvent.SELECT, ({ data }) => {
    lastEvent.value = `选中 ${data.type}`;
  });
  plot.on(DrawEvent.DESELECT, () => {
    lastEvent.value = '取消选中';
  });
  plot.on(DrawEvent.MODIFY_END, ({ dataList }) => {
    lastEvent.value = `编辑 ${dataList[0]?.type ?? ''}`;
  });
  plot.on(DrawEvent.DELETE, () => {
    lastEvent.value = '删除';
    refreshFeatureCount();
  });
});

onUnmounted(() => {
  plot?.destroy();
  plot = null;
  map?.setTarget(undefined);
  map = null;
});
</script>

<style scoped>
.map-container {
  position: relative;
  width: 100%;
  min-height: calc(100vh - 180px);
  overflow: hidden;
  font-size: 13px;
  color: #1f2328;
  background: #f6f8fa;
}

.map-wrapper {
  width: 100%;
  height: calc(100vh - 180px);
}

.toolbar {
  position: absolute;
  top: 12px;
  left: 12px;
  right: 220px;
  z-index: 10;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(31, 35, 40, 0.12);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(31, 35, 40, 0.12);
}

.tool-grid {
  display: grid;
  grid-template-columns: repeat(10, minmax(64px, 1fr));
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.tool-btn,
.action-btn {
  height: 30px;
  padding: 0 10px;
  font: inherit;
  color: #24292f;
  background: #ffffff;
  border: 1px solid #d0d7de;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
}

.tool-btn:hover,
.action-btn:hover {
  border-color: #1677ff;
  color: #1677ff;
}

.tool-btn.active {
  color: #ffffff;
  background: #1677ff;
  border-color: #1677ff;
}

.actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  width: 154px;
}

.action-btn {
  flex: 1 1 68px;
}

.action-btn.danger {
  color: #cf222e;
  border-color: #ffb3ba;
}

.action-btn.danger:hover {
  color: #ffffff;
  background: #cf222e;
  border-color: #cf222e;
}

.status-panel {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  width: 190px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(31, 35, 40, 0.12);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(31, 35, 40, 0.12);
}

.status-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  line-height: 24px;
}

.status-row span {
  color: #57606a;
}

.status-row strong {
  min-width: 0;
  overflow: hidden;
  color: #1f2328;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 860px) {
  .map-container {
    min-height: 720px;
  }

  .map-wrapper {
    height: 720px;
  }

  .toolbar {
    right: 12px;
    flex-direction: column;
  }

  .tool-grid {
    width: 100%;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .actions {
    width: 100%;
  }

  .status-panel {
    top: auto;
    left: 12px;
    right: 12px;
    bottom: 12px;
    width: auto;
  }
}
</style>
