---
title: 多边形
---

# 多边形（Polygon）

用于在地图上绘制任意多边形区域。

# 基础多边形

<demo vue="../examples/polygon/polygon-basic.vue" />

# 快速开始

```ts
import { PolygonTool } from '@seedlib/ol-plot';

const tool = new PolygonTool(map, {
  strokeColor: '#52c41a',
  strokeWidth: 2,
  fillColor: 'rgba(82,196,26,0.15)',
});

tool.activate(); // 单击添加节点，双击完成
```

# 事件

```ts
import { DrawEvent } from '@seedlib/ol-plot';

tool
  .on(DrawEvent.DRAW_START, () => { /* 开始绘制 */ })
  .on(DrawEvent.DRAW_END, ({ feature }) => { /* 绘制完成 */ })
  .on(DrawEvent.SELECT, ({ feature }) => { /* 点击选中 */ })
  .on(DrawEvent.DESELECT, () => { /* 取消选中 */ })
  .on(DrawEvent.MODIFY_END, ({ features }) => { /* 节点编辑完成 */ });
```

# 坐标操作

```ts
// 绘制完成后
tool.getCoordinates()           // 获取外环顶点坐标 number[][]
tool.getPointCount()            // 获取顶点数量（不含闭合重复点）
tool.updatePoint(0, [x, y])    // 更新某个顶点
tool.setCoordinates([[...]])   // 替换全部顶点
```
