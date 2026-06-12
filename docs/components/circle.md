---
title: 圆
---

# 圆 Circle

用于在地图上绘制圆形区域。按住鼠标从圆心拖拽确定半径，松开即完成绘制。

## 基础用法

在地图上按住鼠标确定圆心，拖拽确定半径，松开鼠标完成圆形绘制。

<demo vue="../examples/circle/basic.vue" />

## 绘制行为

- **绘制方式**：按住拖拽，起点为圆心，终点确定半径，松开完成
- **几何类型**：`ol/geom/Circle`
- **坐标表示**：2 个控制点 — 圆心 + 圆周上一点

## 编辑行为

使用 OL 默认 Modify interaction 编辑，两个控制点均可拖拽：
- 拖拽圆心 → 平移整个圆
- 拖拽圆周点 → 改变半径

## 控制点

| 控制点 | 说明 |
|--------|------|
| P0 | 圆心坐标 |
| P1 | 圆周上的点（用于确定半径） |

## Attributes

参见 [PlotConfig 类型定义](#类型声明)。

## Events

圆形工具继承 `BaseTool` 的所有事件。详见 [事件系统](../guide/events)。

| 事件名 | 说明 | 回调参数 |
|--------|------|----------|
| `drawstart` | 按下鼠标开始拖拽 | `{ feature }` |
| `drawend` | 松开鼠标完成圆形 | `{ feature }` |
| `select` | 选中要素 | `{ feature }` |
| `deselect` | 取消选中 | `{ features }` |
| `modifystart` | 开始拖拽控制点 | — |
| `modifyend` | 拖拽控制点结束 | `{ features }` |
| `delete` | 删除要素 | `{ feature }` |

## Methods

### 基础方法

| 方法名 | 说明 | 参数 | 返回值 |
|--------|------|------|--------|
| `addFeature(coords)` | 程序化添加圆形 | `coords: number[][]` — [center, radiusPoint] | `Feature` |
| `getFeatures()` | 获取所有要素 | — | `Feature[]` |
| `clearFeatures()` | 清空所有要素 | — | `this` |
| `on(event, handler)` | 注册事件监听 | `event: string`, `handler: Function` | `this` |
| `off(event, handler)` | 移除事件监听 | `event: string`, `handler: Function` | `this` |
| `destroy()` | 销毁工具实例 | — | `void` |

### 坐标方法

| 方法名 | 说明 | 参数 | 返回值 |
|--------|------|------|--------|
| `getCoordinates()` | 获取 `[center, radiusPoint]` 坐标 | — | `number[][]` |
| `setCoordinates(coords)` | 设置 `[center, radiusPoint]` | `coords: number[][]` | `void` |
| `getPointCount()` | 获取控制点数量 | — | `number`（固定返回 2） |
| `updatePoint(index, coord)` | 更新控制点（0=圆心，1=圆周点） | `index: number`, `coord: number[]` | `void` |

### 便捷方法

| 方法名 | 说明 | 参数 | 返回值 |
|--------|------|------|--------|
| `addCircle(center, radius)` | 程序化添加圆形 | `center: number[]`, `radius: number` | `Feature` |
| `getCenter()` | 获取圆心坐标 | — | `number[] \| null` |
| `getRadius()` | 获取半径 | — | `number` |
| `setCenter(center)` | 设置圆心（半径不变） | `center: number[]` | `void` |
| `setRadius(radius)` | 设置半径（圆心不变） | `radius: number` | `void` |

## 使用示例

### 基础绘制

```ts
import { CircleTool } from 'ol-plot'

const tool = new CircleTool(map, {
  strokeColor: '#722ed1',
  strokeWidth: 2,
  fillColor: 'rgba(114, 46, 209, 0.1)',
})
```

### 程序化添加圆形

```ts
const tool = new CircleTool(map)

// 以 [12958000, 4857000] 为圆心，1000 地图单位为半径
tool.addCircle([12958000, 4857000], 1000)

// 在 EPSG:3857 下，1000 单位 ≈ 1000 米
console.log('圆心：', tool.getCenter())
console.log('半径：', tool.getRadius())
```

### 使用经纬度添加圆形

```ts
import { fromLonLat } from 'ol/proj'

const tool = new CircleTool(map)

// 北京天安门附近，半径 5km
tool.addCircle(fromLonLat([116.3974, 39.9093]), 5000)
```

### 监听事件

```ts
import { CircleTool, DrawEvent } from 'ol-plot'

const tool = new CircleTool(map)

tool
  .on(DrawEvent.DRAW_END, ({ feature }) => {
    console.log('圆心：', tool.getCenter())
    console.log('半径：', tool.getRadius())
  })
  .on(DrawEvent.MODIFY_END, ({ features }) => {
    console.log('圆形已更新，新半径：', tool.getRadius())
  })
```

## 类型声明

```ts
interface PlotConfig {
  strokeColor?: string
  strokeWidth?: number
  fillColor?: string
  lineDash?: number[]
  nodeStyle?: NodeStyle
}

interface NodeStyle {
  radius?: number
  fill?: string
  stroke?: string
  strokeWidth?: number
}
```
