---
title: 圆
---

# 圆（Circle）

通过单击确定圆心、再次单击确定半径来绘制圆形。

# 基础圆

<demo vue="../examples/circle/circle-basic.vue" />

# 快速开始

```ts
import { CircleTool } from '@seedlib/ol-plot';

const tool = new CircleTool(map, {
  strokeColor: '#722ed1',
  strokeWidth: 2,
  fillColor: 'rgba(114,46,209,0.1)',
});

tool.activate(); // 单击圆心，再次单击确定半径
```

# 事件

```ts
import { DrawEvent } from '@seedlib/ol-plot';

tool
  .on(DrawEvent.DRAW_START, () => { /* 开始绘制 */ })
  .on(DrawEvent.DRAW_END, ({ feature }) => { /* 绘制完成 */ })
  .on(DrawEvent.SELECT, ({ feature }) => { /* 点击选中 */ })
  .on(DrawEvent.DESELECT, () => { /* 取消选中 */ })
  .on(DrawEvent.MODIFY_END, ({ features }) => { /* 编辑完成 */ });
```

# 坐标 & 属性操作

```ts
import type OlCircle from 'ol/geom/Circle';

// 通用坐标 API（继承自 BaseTool）
// getCoordinates() 返回 [[cx,cy], [cx+r, cy]] ── 圆心 + 圆周上一点
tool.getCoordinates()                     // [[cx,cy],[rx,ry]]
tool.setCoordinates([[cx,cy],[rx,ry]])    // 同时更新圆心和半径
tool.updatePoint(0, [cx, cy])             // 只移动圆心
tool.updatePoint(1, [rx, ry])             // 通过圆周点调整半径

// CircleTool 专属 API
tool.getCenter()           // number[] | null
tool.getRadius()           // number（地图单位，EPSG:3857 下为米）
tool.setCenter([x, y])     // 移动圆心
tool.setRadius(5000)       // 直接设置半径（米）
```
