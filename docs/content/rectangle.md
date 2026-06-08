---
title: 矩形
---

# 矩形（Rectangle）

通过拖拽两个对角点绘制轴对齐矩形。底层几何类型为 `Polygon`，可与面状样式、面积计算等功能配合使用。

# 基础矩形

<demo vue="../examples/rectangle/rectangle-basic.vue" />

# 快速开始

```ts
import { RectangleTool } from '@seedlib/ol-plot';

const tool = new RectangleTool(map, {
  strokeColor: '#fa8c16',
  strokeWidth: 2,
  fillColor: 'rgba(250,140,22,0.15)',
});

tool.activate(); // 单击起点，再次单击对角点
```

# 事件

```ts
import { DrawEvent } from '@seedlib/ol-plot';

tool
  .on(DrawEvent.DRAW_START, () => { /* 开始绘制 */ })
  .on(DrawEvent.DRAW_END, ({ feature }) => { /* 绘制完成 */ })
  .on(DrawEvent.SELECT, ({ feature }) => { /* 点击选中 */ })
  .on(DrawEvent.DESELECT, () => { /* 取消选中 */ })
  .on(DrawEvent.MODIFY_END, ({ features }) => { /* 角点拖动完成 */ });
```

# 坐标操作

```ts
// 返回 4 个角点坐标（顺序：左上 → 右上 → 右下 → 左下）
tool.getCoordinates()           // number[][]
tool.getPointCount()            // 始终为 4
tool.updatePoint(2, [x, y])    // 更新右下角
```
