---
title: 点
---

# 点（Point）

单击地图即可放置一个点要素，支持拖动编辑位置。

# 基础点

<demo vue="../examples/point/point-basic.vue" />

# 快速开始

```ts
import { PointTool } from '@seedlib/ol-plot';

const tool = new PointTool(map, {
  strokeColor: '#52c41a',
  strokeWidth: 2,
  fillColor: 'rgba(82,196,26,0.2)',
});

tool.activate(); // 单击地图放置点
```

# 事件

```ts
import { DrawEvent } from '@seedlib/ol-plot';

tool
  .on(DrawEvent.DRAW_START, () => { /* 开始绘制 */ })
  .on(DrawEvent.DRAW_END, ({ feature }) => { /* 绘制完成 */ })
  .on(DrawEvent.SELECT, ({ feature }) => { /* 点击选中 */ })
  .on(DrawEvent.DESELECT, () => { /* 取消选中 */ })
  .on(DrawEvent.MODIFY_END, ({ features }) => { /* 拖动完成 */ });
```

# 坐标操作

```ts
// getCoordinates() 返回 [[x, y]]（单元素数组，与其他工具接口统一）
tool.getCoordinates()              // [[x, y]]
tool.setCoordinates([[x, y]])      // 编程设置点位置
tool.updatePoint(0, [x, y])        // 更新点坐标
tool.getPosition()                 // number[] | null，直接获取 [x, y]
```
