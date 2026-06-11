---
title: 多边形
---

# 多边形 Polygon

用于在地图上绘制任意多边形区域。单击添加顶点，双击或点击起始点闭合完成绘制。

## 基础用法

单击地图添加顶点，双击地图（或点击第一个顶点）闭合多边形。绘制完成后自动选中，进入编辑态可拖拽各顶点。

<demo vue="../examples/polygon/polygon-basic.vue" />

## 绘制行为

- **绘制方式**：单击添加顶点，双击（或点击起始点）闭合
- **几何类型**：`ol/geom/Polygon`
- **闭合处理**：首尾自动闭合，`getCoordinates()` 和 `getPointCount()` 均不包含闭合点

## 编辑行为

选中状态下通过 OL 默认 Modify interaction 编辑，所有顶点均可拖拽。拖拽第一个顶点时，闭合点会自动同步更新，确保环的完整性。

## 控制点

| 控制点 | 说明 |
|--------|------|
| P0 ~ Pn-1 | 多边形各顶点（不含闭合重复点） |

## Attributes

参见 [PlotConfig 类型定义](#类型声明)。

## Events

多边形工具继承 `BaseTool` 的所有事件。详见 [事件系统](../guide/events)。

| 事件名 | 说明 | 回调参数 |
|--------|------|----------|
| `drawstart` | 开始绘制 | `{ feature }` |
| `drawend` | 绘制完成（闭合） | `{ feature }` |
| `select` | 选中要素 | `{ feature }` |
| `deselect` | 取消选中 | `{ features }` |
| `modifystart` | 开始拖拽顶点 | — |
| `modifyend` | 拖拽顶点结束 | `{ features }` |
| `delete` | 删除要素 | `{ feature }` |

## Methods

### 基础方法

| 方法名 | 说明 | 参数 | 返回值 |
|--------|------|------|--------|
| `addFeature(coords)` | 程序化添加多边形 | `coords: number[][]` — 顶点数组（不含闭合点） | `Feature` |
| `getFeatures()` | 获取所有要素 | — | `Feature[]` |
| `clearFeatures()` | 清空所有要素 | — | `this` |
| `on(event, handler)` | 注册事件监听 | `event: string`, `handler: Function` | `this` |
| `off(event, handler)` | 移除事件监听 | `event: string`, `handler: Function` | `this` |
| `destroy()` | 销毁工具实例 | — | `void` |

### 坐标方法

| 方法名 | 说明 | 参数 | 返回值 |
|--------|------|------|--------|
| `getCoordinates()` | 获取顶点坐标（不含闭合点） | — | `number[][]` |
| `setCoordinates(coords)` | 设置顶点坐标（不含闭合点） | `coords: number[][]` | `void` |
| `getPointCount()` | 获取顶点数量（不含闭合点） | — | `number` |
| `updatePoint(index, coord)` | 更新指定顶点 | `index: number`, `coord: number[]` | `void` |

## 使用示例

### 基础绘制

```ts
import { PolygonTool } from 'ol-plot'

const tool = new PolygonTool(map, {
  strokeColor: '#52c41a',
  strokeWidth: 2,
  fillColor: 'rgba(82, 196, 26, 0.15)',
})
```

### 虚线边框多边形

```ts
import { PolygonTool } from 'ol-plot'

const tool = new PolygonTool(map, {
  strokeColor: '#fa8c16',
  strokeWidth: 2,
  lineDash: [20, 10],
  fillColor: 'rgba(250, 140, 22, 0.1)',
  nodeStyle: {
    radius: 5,
    fill: '#fff',
    stroke: '#fa8c16',
    strokeWidth: 2,
  },
})
```

### 程序化添加多边形

```ts
const tool = new PolygonTool(map)

// 添加一个三角形（无需传入闭合点）
tool.addFeature([
  [12958000, 4857000],
  [12968000, 4858000],
  [12975000, 4856000],
])

// 获取顶点（不含闭合点）
const coords = tool.getCoordinates()
console.log('顶点数：', tool.getPointCount()) // 3
```

### 更新顶点

```ts
// 修改第一个顶点（闭合点自动同步）
tool.updatePoint(0, [12960000, 4857500])
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
