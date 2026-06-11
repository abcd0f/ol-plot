---
title: 快速开始
---

# 快速开始

本文将引导你使用 `ol-plot` 创建第一个地图绘图应用。

## 创建地图

首先创建一个基础的 OpenLayers 地图实例：

```ts
import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import XYZ from 'ol/source/XYZ'
import { fromLonLat } from 'ol/proj'

const map = new Map({
  target: 'map',
  layers: [
    new TileLayer({
      source: new XYZ({
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      }),
    }),
  ],
  view: new View({
    center: fromLonLat([116.3974, 39.9093]),
    zoom: 10,
  }),
})
```

## 创建绘图工具

创建绘图工具实例，构造函数接收地图实例和可选的样式配置：

```ts
import { LineTool } from 'ol-plot'

const tool = new LineTool(map, {
  strokeColor: '#1890ff',
  strokeWidth: 3,
})
```

工具在实例化后**自动进入绘制态**，无需调用额外的激活方法。

## 完整示例

以下示例展示了如何在 Vue 3 组件中集成 `ol-plot`：

```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import XYZ from 'ol/source/XYZ'
import { fromLonLat } from 'ol/proj'
import { LineTool, DrawEvent } from 'ol-plot'

const mapEl = ref<HTMLDivElement>()
let map: Map
let tool: LineTool

onMounted(() => {
  map = new Map({
    target: mapEl.value,
    layers: [new TileLayer({ source: new XYZ({ url: '...' }) })],
    view: new View({ center: fromLonLat([116.4, 39.9]), zoom: 10 }),
  })

  tool = new LineTool(map, { strokeColor: '#1890ff' })

  // 监听绘制完成事件
  tool.on(DrawEvent.DRAW_END, ({ feature }) => {
    console.log('绘制完成:', tool.getCoordinates())
  })
})

onUnmounted(() => {
  tool.destroy()
})
</script>

<template>
  <div ref="mapEl" style="width: 100%; height: 500px" />
</template>
```

## 交互行为

工具实例化后，默认行为如下：

| 操作 | 行为 |
|------|------|
| 点击**空白区域** | 开始绘制新图形 |
| 图形绘制**完成** | 自动选中并进入编辑态，显示控制点 |
| 点击**已有图形** | 切换选中该图形，进入编辑态 |
| 拖拽**控制点** | 修改图形形状 |
| 点击**空白区域**（有选中时） | 取消选中，保留图形 |
| 按 `Delete` / `Backspace` | 删除当前选中的图形 |

## 销毁工具

切换工具或在组件卸载时，需要销毁当前工具实例：

```ts
tool.destroy()
```

`destroy()` 会移除所有 OL interaction、图层和事件监听。

## 常见模式

### 工具切换

```ts
let currentTool: BaseTool | null = null

function switchToTool(ToolClass: typeof BaseTool) {
  currentTool?.destroy()
  currentTool = new ToolClass(map, config)
}
```

### 获取已绘制数据

```ts
// 获取所有要素
const features = tool.getFeatures()

// 获取当前选中要素的坐标
const coords = tool.getCoordinates()

// 获取控制点数量
const count = tool.getPointCount()
```

## 下一步

- 查看各个绘图组件的详细文档
- 了解 [事件系统](./events)
- 阅读 [API 参考](../api)
