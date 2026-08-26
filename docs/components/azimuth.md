---
title: 方位角
---

# 方位角 AzimuthTool

通过两个点绘制方向线和圆形范围：第一点为起点/圆心，第二点为方向点；圆通过第二点，标签显示两点地表距离和以真北为 0°、顺时针递增的方位角。

## 基础用法

<demo vue="../examples/azimuth/basic.vue" />

```ts
import { AzimuthTool } from '@seedlib/ol-plot'

const tool = new AzimuthTool(map, {
  measure: { unit: 'kilometers' },
})
```

绘制始终只接受两个控制点，不会因为圆的几何边界产生额外编辑点。绘制完成后点击线或圆均可进入编辑模式，拖拽两个控制点会同步更新方向线、圆、距离和方位角。

## 方法

| 方法 | 说明 |
| --- | --- |
| `getCoordinates()` | 返回 `[起点, 方向点]` |
| `getDistance()` | 返回两点地表距离（米） |
| `getAzimuth()` | 返回方位角（0°–360°） |
| `getPointCount()` | 固定返回 `2` |

`measure.unit` 支持 Turf 的全部 `Units`，仅影响标签显示单位，不影响 `getDistance()` 的米制返回值。
