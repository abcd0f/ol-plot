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
        <span>选中标绘</span>
        <strong>{{ selectedLabel }}</strong>
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

    <div class="style-panel" :class="{ disabled: !hasSelection }">
      <div class="panel-title">样式</div>

      <label class="field">
        <span>描边</span>
        <input v-model="styleForm.strokeColor" type="color" :disabled="!hasSelection" />
      </label>

      <label class="field">
        <span>线宽</span>
        <input v-model.number="styleForm.strokeWidth" type="range" min="1" max="16" :disabled="!hasSelection" />
        <em>{{ styleForm.strokeWidth }}</em>
      </label>

      <label class="field">
        <span>填充</span>
        <input v-model="styleForm.fillColor" type="color" :disabled="!hasSelection" />
      </label>

      <label class="field">
        <span>透明</span>
        <input v-model.number="styleForm.fillOpacity" type="range" min="0" max="100" :disabled="!hasSelection" />
        <em>{{ styleForm.fillOpacity }}%</em>
      </label>

      <label class="field">
        <span>线型</span>
        <select v-model="styleForm.lineDashMode" :disabled="!hasSelection">
          <option value="solid">实线</option>
          <option value="dashed">虚线</option>
          <option value="dotted">点线</option>
        </select>
      </label>

      <div class="panel-title compact">控制点</div>

      <label class="field">
        <span>半径</span>
        <input v-model.number="styleForm.nodeRadius" type="range" min="3" max="14" :disabled="!hasSelection" />
        <em>{{ styleForm.nodeRadius }}</em>
      </label>

      <label class="field">
        <span>填充</span>
        <input v-model="styleForm.nodeFill" type="color" :disabled="!hasSelection" />
      </label>

      <label class="field">
        <span>描边</span>
        <input v-model="styleForm.nodeStroke" type="color" :disabled="!hasSelection" />
      </label>

      <template v-if="selectedType === DrawType.FlowLine">
        <div class="panel-title compact">流向线</div>

        <label class="field">
          <span>箭头</span>
          <input v-model="styleForm.arrowColor" type="color" :disabled="!hasSelection" />
        </label>

        <label class="field">
          <span>间距</span>
          <input v-model.number="styleForm.arrowSpacing" type="range" min="16" max="120" :disabled="!hasSelection" />
          <em>{{ styleForm.arrowSpacing }}</em>
        </label>

        <label class="field">
          <span>速度</span>
          <input v-model.number="styleForm.flowSpeed" type="range" min="0" max="160" :disabled="!hasSelection" />
          <em>{{ styleForm.flowSpeed }}</em>
        </label>
      </template>

      <template v-if="selectedType === DrawType.ImagePoint">
        <div class="panel-title compact">图片点</div>

        <label class="field">
          <span>缩放</span>
          <input
            v-model.number="styleForm.imageScale"
            type="range"
            min="0.3"
            max="2"
            step="0.1"
            :disabled="!hasSelection"
          />
          <em>{{ styleForm.imageScale }}</em>
        </label>

        <label class="field">
          <span>透明</span>
          <input v-model.number="styleForm.imageOpacity" type="range" min="0" max="100" :disabled="!hasSelection" />
          <em>{{ styleForm.imageOpacity }}%</em>
        </label>

        <label class="field">
          <span>文字</span>
          <input v-model="styleForm.imageLabelText" type="text" :disabled="!hasSelection" placeholder="图片点文字" />
        </label>

        <label class="field">
          <span>字号</span>
          <input
            v-model.number="styleForm.imageLabelFontSize"
            type="range"
            min="10"
            max="32"
            step="1"
            :disabled="!hasSelection"
          />
          <em>{{ styleForm.imageLabelFontSize }}px</em>
        </label>

        <label class="field">
          <span>文字颜色</span>
          <input v-model="styleForm.imageLabelColor" type="color" :disabled="!hasSelection" />
        </label>
      </template>
    </div>

    <div ref="el" class="map-wrapper" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import OlMap from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import { fromLonLat } from 'ol/proj';
import { DrawEvent, DrawType, PlotManager } from '@seedlib/ol-plot';
import type { PlotDrawType, PlotManagerConfig, PlotStyleData } from '@seedlib/ol-plot';

interface ToolItem {
  label: string;
  type: PlotDrawType;
}

type LineDashMode = 'solid' | 'dashed' | 'dotted';

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
  { label: '斜箭头', type: DrawType.TaperedArrow },
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

const markerSrc = `data:image/svg+xml,${markerSvg}`;
const el = ref<HTMLDivElement>();
const activeType = ref<PlotDrawType | null>(DrawType.Point);
const selectedType = ref<PlotDrawType | null>(null);
const featureCount = ref(0);
const lastEvent = ref('未开始');
const syncingStyle = ref(false);

const styleForm = reactive({
  strokeColor: '#1677ff',
  strokeWidth: 3,
  fillColor: '#1677ff',
  fillOpacity: 16,
  lineDashMode: 'solid' as LineDashMode,
  nodeRadius: 6,
  nodeFill: '#ffffff',
  nodeStroke: '#1677ff',
  nodeStrokeWidth: 2,
  arrowColor: '#00b96b',
  arrowSpacing: 56,
  flowSpeed: 72,
  imageScale: 0.8,
  imageOpacity: 100,
  imageLabelText: '图片点',
  imageLabelFontSize: 14,
  imageLabelColor: '#1f2937',
});

let map: OlMap | null = null;
let plot: PlotManager | null = null;

const activeLabel = computed(() => {
  if (!activeType.value) return '无';
  return findToolLabel(activeType.value);
});

const selectedLabel = computed(() => {
  if (!selectedType.value) return '未选中';
  return findToolLabel(selectedType.value);
});

const hasSelection = computed(() => selectedType.value !== null);

watch(
  styleForm,
  () => {
    if (syncingStyle.value || !hasSelection.value) return;
    applySelectedStyle();
  },
  { deep: true },
);

function findToolLabel(type: PlotDrawType): string {
  return tools.find((tool) => tool.type === type)?.label ?? String(type);
}

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
  selectedType.value = null;
  lastEvent.value = '清空';
  refreshFeatureCount();
}

function exportData(): void {
  const data = plot?.getPlotData() ?? [];
  lastEvent.value = `导出 ${data.length} 个`;
  console.log('ol-plot data:', data);
}

function applySelectedStyle(): void {
  const config: PlotManagerConfig = {
    strokeColor: styleForm.strokeColor,
    strokeWidth: styleForm.strokeWidth,
    fillColor: toRgba(styleForm.fillColor, styleForm.fillOpacity / 100),
    lineDash: getLineDash(styleForm.lineDashMode),
    nodeStyle: {
      radius: styleForm.nodeRadius,
      fill: styleForm.nodeFill,
      stroke: styleForm.nodeStroke,
      strokeWidth: styleForm.nodeStrokeWidth,
    },
  };

  if (selectedType.value === DrawType.FlowLine) {
    config.flowLine = {
      arrowColor: styleForm.arrowColor,
      arrowSpacing: styleForm.arrowSpacing,
      speed: styleForm.flowSpeed,
    };
  }

  if (selectedType.value === DrawType.ImagePoint) {
    config.image = {
      src: markerSrc,
      scale: styleForm.imageScale,
      anchor: [0.5, 1],
      opacity: styleForm.imageOpacity / 100,
      label: {
        text: styleForm.imageLabelText,
        fontSize: styleForm.imageLabelFontSize,
        color: styleForm.imageLabelColor,
      },
    };
  }

  plot?.setStyleConfig(config);
}

async function syncStyleForm(style: PlotStyleData): Promise<void> {
  syncingStyle.value = true;
  const fill = parseCssColor(style.fillColor, '#1677ff', 0.16);

  styleForm.strokeColor = parseCssColor(style.strokeColor, '#1677ff', 1).color;
  styleForm.strokeWidth = style.strokeWidth;
  styleForm.fillColor = fill.color;
  styleForm.fillOpacity = Math.round(fill.alpha * 100);
  styleForm.lineDashMode = getLineDashMode(style.lineDash);
  styleForm.nodeRadius = style.nodeStyle.radius ?? 6;
  styleForm.nodeFill = parseCssColor(style.nodeStyle.fill ?? '#ffffff', '#ffffff', 1).color;
  styleForm.nodeStroke = parseCssColor(style.nodeStyle.stroke ?? style.strokeColor, '#1677ff', 1).color;
  styleForm.nodeStrokeWidth = style.nodeStyle.strokeWidth ?? 2;
  styleForm.arrowColor = parseCssColor(style.flowLine?.arrowColor || style.strokeColor, '#00b96b', 1).color;
  styleForm.arrowSpacing = style.flowLine?.arrowSpacing ?? 56;
  styleForm.flowSpeed = style.flowLine?.speed ?? 72;
  styleForm.imageScale = style.image?.scale ?? 0.8;
  styleForm.imageOpacity = Math.round((style.image?.opacity ?? 1) * 100);
  styleForm.imageLabelText = style.image?.label?.text ?? '';
  styleForm.imageLabelFontSize = parseFontSize(style.image?.label?.fontSize, 14);
  styleForm.imageLabelColor = parseCssColor(style.image?.label?.color ?? '#1f2937', '#1f2937', 1).color;

  await nextTick();
  syncingStyle.value = false;
}

function getLineDash(mode: LineDashMode): number[] {
  if (mode === 'dashed') return [10, 8];
  if (mode === 'dotted') return [2, 8];
  return [];
}

function getLineDashMode(lineDash?: number[]): LineDashMode {
  if (!lineDash || lineDash.length === 0) return 'solid';
  if (lineDash[0] <= 3) return 'dotted';
  return 'dashed';
}

function parseFontSize(value: number | string | undefined, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  const parsed = Number.parseFloat(value ?? '');
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toRgba(hex: string, alpha: number): string {
  const normalized = normalizeHex(hex, '#1677ff');
  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
}

function parseCssColor(value: string, fallback: string, fallbackAlpha: number): { color: string; alpha: number } {
  const hex = normalizeHex(value, '');
  if (hex) return { color: hex, alpha: 1 };

  const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([.\d]+))?\)/i);
  if (!match) return { color: fallback, alpha: fallbackAlpha };

  const r = Number(match[1]);
  const g = Number(match[2]);
  const b = Number(match[3]);
  const alpha = match[4] === undefined ? 1 : Number(match[4]);
  return {
    color: `#${toHex(r)}${toHex(g)}${toHex(b)}`,
    alpha: Number.isFinite(alpha) ? Math.max(0, Math.min(alpha, 1)) : fallbackAlpha,
  };
}

function normalizeHex(value: string, fallback: string): string {
  if (/^#[0-9a-f]{6}$/i.test(value)) return value;
  if (/^#[0-9a-f]{3}$/i.test(value)) {
    return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
  }
  return fallback;
}

function toHex(value: number): string {
  return Math.max(0, Math.min(255, value)).toString(16).padStart(2, '0');
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
    strokeWidth: 3,
    fillColor: 'rgba(22, 119, 255, 0.16)',
    nodeStyle: {
      radius: 6,
      fill: '#ffffff',
      stroke: '#1677ff',
      strokeWidth: 2,
    },
    image: {
      src: markerSrc,
      scale: 0.8,
      anchor: [0.5, 1],
      label: {
        text: styleForm.imageLabelText,
        fontSize: styleForm.imageLabelFontSize,
        color: styleForm.imageLabelColor,
      },
    },
    flowLine: {
      arrowColor: '#00b96b',
      arrowSpacing: 56,
      speed: 72,
    },
    measure: {
      mode: 'both',
      unit: 'm',
    },
  });

  plot.setActiveTool(activeType.value);

  plot.on(DrawEvent.DRAW_END, ({ data }) => {
    lastEvent.value = `绘制 ${data.type}`;
    refreshFeatureCount();
  });
  plot.on(DrawEvent.SELECT, ({ data }) => {
    selectedType.value = data.type;
    lastEvent.value = `选中 ${data.type}`;
    syncStyleForm(data.style);
  });
  plot.on(DrawEvent.DESELECT, () => {
    selectedType.value = null;
    lastEvent.value = '取消选中';
  });
  plot.on(DrawEvent.MODIFY_END, ({ dataList }) => {
    lastEvent.value = `编辑 ${dataList[0]?.type ?? ''}`;
  });
  plot.on(DrawEvent.DELETE, () => {
    selectedType.value = null;
    lastEvent.value = '删除';
    refreshFeatureCount();
  });

  plot.loadPlotData([
    {
      type: 'ImagePoint',
      plotType: 'imagePoint',
      coordinates: [[115.73272714843746, 40.0729074806824]],
      controlPoints: [[115.73272714843746, 40.0729074806824]],
      style: {
        strokeColor: '#1677ff',
        strokeWidth: 3,
        fillColor: 'rgba(22, 119, 255, 0.16)',
        lineDash: [],
        nodeStyle: {
          radius: 6,
          fill: '#ffffff',
          stroke: '#1677ff',
          strokeWidth: 2,
        },
        image: {
          src: 'data:image/svg+xml,%0A%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2236%22%20height%3D%2244%22%20viewBox%3D%220%200%2036%2044%22%3E%0A%20%20%3Cpath%20fill%3D%22%23ff4d4f%22%20d%3D%22M18%200C8.06%200%200%208.06%200%2018c0%2013.5%2018%2026%2018%2026s18-12.5%2018-26C36%208.06%2027.94%200%2018%200z%22%2F%3E%0A%20%20%3Ccircle%20cx%3D%2218%22%20cy%3D%2218%22%20r%3D%227%22%20fill%3D%22%23fff%22%2F%3E%0A%3C%2Fsvg%3E%0A',
          scale: 0.8,
          anchor: [0.5, 1],
          opacity: 1,
          label: {
            text: '图片点===',
            fontSize: 14,
            color: '#1f2937',
          },
        },
      },
      properties: {},
    },
    {
      type: 'ImagePoint',
      plotType: 'imagePoint',
      coordinates: [[116.19415292968746, 40.08761818134971]],
      controlPoints: [[116.19415292968746, 40.08761818134971]],
      style: {
        strokeColor: '#1677ff',
        strokeWidth: 3,
        fillColor: 'rgba(22, 119, 255, 0.16)',
        lineDash: [],
        nodeStyle: {
          radius: 6,
          fill: '#ffffff',
          stroke: '#1677ff',
          strokeWidth: 2,
        },
        image: {
          src: 'data:image/svg+xml,%0A%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2236%22%20height%3D%2244%22%20viewBox%3D%220%200%2036%2044%22%3E%0A%20%20%3Cpath%20fill%3D%22%23ff4d4f%22%20d%3D%22M18%200C8.06%200%200%208.06%200%2018c0%2013.5%2018%2026%2018%2026s18-12.5%2018-26C36%208.06%2027.94%200%2018%200z%22%2F%3E%0A%20%20%3Ccircle%20cx%3D%2218%22%20cy%3D%2218%22%20r%3D%227%22%20fill%3D%22%23fff%22%2F%3E%0A%3C%2Fsvg%3E%0A',
          scale: 0.8,
          anchor: [0.5, 1],
          opacity: 1,
          label: {
            text: '图片点1111',
            fontSize: 14,
            color: '#1f2937',
          },
        },
      },
      properties: {},
    },
    {
      type: 'Point',
      plotType: 'point',
      coordinates: [[115.43334970703121, 39.959318129602366]],
      controlPoints: [[115.43334970703121, 39.959318129602366]],
      style: {
        strokeColor: '#1677ff',
        strokeWidth: 3,
        fillColor: 'rgba(22, 119, 255, 0.16)',
        lineDash: [],
        nodeStyle: {
          radius: 6,
          fill: '#ffffff',
          stroke: '#1677ff',
          strokeWidth: 2,
        },
      },
      properties: {},
    },
    {
      type: 'ImagePoint',
      plotType: 'imagePoint',
      coordinates: [[116.28753671874996, 39.791745453443525]],
      controlPoints: [[116.28753671874996, 39.791745453443525]],
      style: {
        strokeColor: '#1677ff',
        strokeWidth: 3,
        fillColor: 'rgba(22, 119, 255, 0.16)',
        lineDash: [],
        nodeStyle: {
          radius: 6,
          fill: '#ffffff',
          stroke: '#1677ff',
          strokeWidth: 2,
        },
        image: {
          src: 'data:image/svg+xml,%0A%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2236%22%20height%3D%2244%22%20viewBox%3D%220%200%2036%2044%22%3E%0A%20%20%3Cpath%20fill%3D%22%23ff4d4f%22%20d%3D%22M18%200C8.06%200%200%208.06%200%2018c0%2013.5%2018%2026%2018%2026s18-12.5%2018-26C36%208.06%2027.94%200%2018%200z%22%2F%3E%0A%20%20%3Ccircle%20cx%3D%2218%22%20cy%3D%2218%22%20r%3D%227%22%20fill%3D%22%23fff%22%2F%3E%0A%3C%2Fsvg%3E%0A',
          scale: 0.8,
          anchor: [0.5, 1],
          opacity: 1,
          label: {
            text: '图片点789',
            fontSize: 14,
            color: '#1f2937',
          },
        },
      },
      properties: {},
    },
    {
      type: 'ImagePoint',
      plotType: 'imagePoint',
      coordinates: [[115.91949472656248, 39.74318896907127]],
      controlPoints: [[115.91949472656248, 39.74318896907127]],
      style: {
        strokeColor: '#1677ff',
        strokeWidth: 3,
        fillColor: 'rgba(22, 119, 255, 0.16)',
        lineDash: [],
        nodeStyle: {
          radius: 6,
          fill: '#ffffff',
          stroke: '#1677ff',
          strokeWidth: 2,
        },
        image: {
          src: 'data:image/svg+xml,%0A%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2236%22%20height%3D%2244%22%20viewBox%3D%220%200%2036%2044%22%3E%0A%20%20%3Cpath%20fill%3D%22%23ff4d4f%22%20d%3D%22M18%200C8.06%200%200%208.06%200%2018c0%2013.5%2018%2026%2018%2026s18-12.5%2018-26C36%208.06%2027.94%200%2018%200z%22%2F%3E%0A%20%20%3Ccircle%20cx%3D%2218%22%20cy%3D%2218%22%20r%3D%227%22%20fill%3D%22%23fff%22%2F%3E%0A%3C%2Fsvg%3E%0A',
          scale: 0.8,
          anchor: [0.5, 1],
          opacity: 1,
          label: {
            text: '图片点===',
            fontSize: 14,
            color: '#1f2937',
          },
        },
      },
      properties: {},
    },
  ]);
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

.toolbar,
.status-panel,
.style-panel {
  position: absolute;
  z-index: 10;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(31, 35, 40, 0.12);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(31, 35, 40, 0.12);
}

.toolbar {
  top: 12px;
  left: 12px;
  right: 270px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px;
  width: 200px;
  flex-direction: column;
}

.tool-grid {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.tool-btn,
.action-btn {
  width: 100%;
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
  color: #1677ff;
  border-color: #1677ff;
}

.tool-btn.active {
  color: #ffffff;
  background: #1677ff;
  border-color: #1677ff;
}

.actions {
  width: 100%;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  border-top: 1px solid #d0d7de;
  padding-top: 10px;
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
  top: 12px;
  right: 12px;
  width: 230px;
  padding: 10px 12px;
}

.status-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  line-height: 24px;
}

.status-row span,
.field span {
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

.style-panel {
  top: 138px;
  right: 12px;
  width: 230px;
  padding: 12px;
  height: calc(100% - 152px);
  overflow-y: auto;
}

.style-panel.disabled {
  opacity: 0.62;
}

.panel-title {
  margin-bottom: 10px;
  color: #1f2328;
  font-weight: 700;
}

.panel-title.compact {
  margin-top: 14px;
  margin-bottom: 8px;
}

.field {
  display: grid;
  grid-template-columns: 44px 1fr 42px;
  align-items: center;
  gap: 8px;
  min-height: 30px;
  margin-top: 8px;
}

.field input[type='color'] {
  width: 100%;
  height: 28px;
  padding: 2px;
  border: 1px solid #d0d7de;
  border-radius: 6px;
  background: #ffffff;
}

.field input[type='text'] {
  grid-column: span 2;
  width: 100%;
  height: 28px;
  padding: 0 8px;
  color: #24292f;
  background: #ffffff;
  border: 1px solid #d0d7de;
  border-radius: 6px;
  box-sizing: border-box;
}

.field input[type='range'] {
  width: 100%;
}

.field select {
  grid-column: span 2;
  height: 28px;
  color: #24292f;
  background: #ffffff;
  border: 1px solid #d0d7de;
  border-radius: 6px;
}

.field em {
  color: #57606a;
  font-style: normal;
  text-align: right;
}

@media (max-width: 900px) {
  .map-container {
    min-height: 820px;
  }

  .map-wrapper {
    height: 820px;
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

  .style-panel {
    top: auto;
    left: 12px;
    right: 12px;
    bottom: 126px;
    width: auto;
  }
}
</style>
