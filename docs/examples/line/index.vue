<template>
  <div class="map-container">
    <!-- 地图主体 -->
    <div ref="el" class="map-wrapper" />

    <!-- 工具栏 -->
    <div class="toolbar">
      <button
        v-for="tool in toolbarItems"
        :key="tool.key"
        :class="['toolbar-btn', { active: activeTool === tool.key }]"
        :title="tool.label"
        @click="handleToolClick(tool.key)"
      >
        {{ tool.label }}
      </button>

      <div class="toolbar-divider" />

      <button class="toolbar-btn danger" title="清空" @click="handleClear">清空</button>
    </div>

    <!-- 状态提示 -->
    <div v-if="statusText" class="status-tip">
      {{ statusText }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

import OlMap from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import { fromLonLat } from 'ol/proj';

// 引入标绘工具库
import { LineTool, DrawEvent, LINE_DASH, LineCap, ToolStatus } from '../../../src';
import type { IDrawTool } from '../../../src';

// ─── 工具栏配置 ─────────────────────────────────────────────────────────────

type ToolKey = 'solid' | 'dashed' | 'dotted' | 'twoPoint';

interface ToolbarItem {
  key: ToolKey;
  label: string;
}

const toolbarItems: ToolbarItem[] = [
  { key: 'solid', label: '折线' },
  { key: 'dashed', label: '虚线' },
  { key: 'dotted', label: '点线' },
  { key: 'twoPoint', label: '直线段' },
];

// ─── 响应式状态 ──────────────────────────────────────────────────────────────

const el = ref<HTMLDivElement>();
const activeTool = ref<ToolKey | null>(null);
const featureCount = ref(0);

const statusText = computed(() => {
  if (!activeTool.value) return '';
  const map: Record<ToolKey, string> = {
    solid: '单击添加折点，双击完成',
    dashed: '单击添加折点，双击完成',
    dotted: '单击添加折点，双击完成',
    twoPoint: '单击起点，再单击终点完成',
  };
  return map[activeTool.value];
});

// ─── OL / 工具实例（非响应式，放在 ref 外）──────────────────────────────────

let map: OlMap | null = null;

// 工具集合，key 与 ToolbarItem.key 对应
let tools: Record<ToolKey, IDrawTool> | null = null;

// ─── 初始化 ──────────────────────────────────────────────────────────────────

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

  initTools(map);
});

onUnmounted(() => {
  // 销毁所有工具（移除图层、交互、事件监听）
  tools && Object.values(tools).forEach((t) => t.destroy());
  tools = null;
  map?.setTarget(undefined);
  map = null;
});

// ─── 工具初始化 ──────────────────────────────────────────────────────────────

function initTools(olMap: OlMap): void {
  tools = {
    // 默认实线折线
    solid: new LineTool(olMap, {
      stroke: {
        color: 'rgba(24, 144, 255, 1)',
        width: 2,
        lineDash: LINE_DASH.SOLID,
        lineCap: LineCap.ROUND,
      },
    }),

    // 橙色虚线
    dashed: new LineTool(olMap, {
      stroke: {
        color: 'rgba(250, 173, 20, 1)',
        width: 2,
        lineDash: LINE_DASH.DASHED,
      },
      sketchStroke: {
        color: 'rgba(250, 173, 20, 0.5)',
        lineDash: LINE_DASH.DASHED,
      },
    }),

    // 紫色点线
    dotted: new LineTool(olMap, {
      stroke: {
        color: 'rgba(114, 46, 209, 1)',
        width: 3,
        lineDash: LINE_DASH.DOTTED,
        lineCap: LineCap.ROUND,
      },
    }),

    // 两点直线段（maxPoints: 2，绘完自动结束）
    twoPoint: new LineTool(olMap, {
      stroke: {
        color: 'rgba(245, 34, 45, 1)',
        width: 2,
      },
      interaction: {
        maxPoints: 2,
      },
    }),
  };

  // 统一绑定事件
  (Object.entries(tools) as [ToolKey, IDrawTool][]).forEach(([key, tool]) => {
    tool
      .on(DrawEvent.DRAW_START, () => {
        console.log(`[${key}] 开始绘制`);
      })
      .on(DrawEvent.DRAW_END, ({ feature }) => {
        featureCount.value++;
        const coords = (feature.getGeometry() as import('ol/geom').LineString).getCoordinates();
        console.log(`[${key}] 绘制完成，坐标点数：${coords.length}`);
      })
      .on(DrawEvent.DRAW_ABORT, () => {
        console.log(`[${key}] 绘制取消`);
      });
  });
}

// ─── 工具栏操作 ──────────────────────────────────────────────────────────────

function handleToolClick(key: ToolKey): void {
  if (!tools) return;

  // 再次点击同一工具 → 取消激活
  if (activeTool.value === key) {
    tools[key].deactivate();
    activeTool.value = null;
    return;
  }

  // 停用当前激活工具
  if (activeTool.value) {
    tools[activeTool.value].deactivate();
  }

  // 激活新工具
  tools[key].activate();
  activeTool.value = key;
}

function handleClear(): void {
  if (!tools) return;
  Object.values(tools).forEach((t) => t.clear());
  featureCount.value = 0;
}
</script>

<style scoped>
.map-container {
  position: relative;
  width: 100%;
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
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(4px);
  z-index: 10;
}

.toolbar-btn {
  padding: 5px 12px;
  font-size: 13px;
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
  height: 20px;
  background: #e8e8e8;
  margin: 0 2px;
}

/* 状态提示 */
.status-tip {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  padding: 6px 16px;
  font-size: 13px;
  color: #fff;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 20px;
  pointer-events: none;
  z-index: 10;
}
</style>
