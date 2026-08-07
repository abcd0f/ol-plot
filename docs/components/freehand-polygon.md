---
title: 自由面
---

# 自由面 FreehandPolygon

用于在地图上手绘自由形状面。第一次点击确定起点，移动鼠标时持续采样边界轨迹，第二次点击结束并自动闭合为 `Polygon`。

## 基础用法

<demo vue="../examples/free-surface/basic.vue" />

## 绘制行为

- **绘制方式**：点击起点，移动鼠标采样边界，再次点击结束
- **几何类型**：`ol/geom/Polygon`
- **编辑方式**：绘制完成后自动选中，可拖拽采样顶点调整边界

## Methods

自由面工具的 API 与 [多边形 Polygon](./polygon) 基本一致。

```ts
import { FreehandPolygonTool } from 'ol-plot';

const tool = new FreehandPolygonTool(map, {
  strokeColor: '#13c2c2',
  strokeWidth: 2,
  fillColor: 'rgba(19, 194, 194, 0.18)',
});
```
