---
title: 折线
---

# 折线 Line

用于在地图上绘制折线、路径线、轨迹线等线状要素。通过逐点点击添加顶点，支持任意数量的顶点。

## 基础用法

单击地图添加节点，双击地图完成绘制。绘制完成后自动选中，进入编辑态可拖拽各顶点。

<demo vue="../examples/line/basic.vue" />

## 绘制行为

- **绘制方式**：单击添加节点，双击结束绘制
- **几何类型**：`ol/geom/LineString`
- **几何样式**：`stroke` 描边 + `lineDash` 虚线（通过 `PlotConfig` 配置）

## 编辑行为

选中状态下通过 OL 默认 Modify interaction 编辑，所有顶点均可拖拽。

## 控制点

| 控制点 | 说明 |
|--------|------|
| P0 ~ Pn | 折线的各顶点，数量取决于绘制时添加的节点数 |

## Attributes

参见 [PlotConfig 类型定义](#类型声明)。

## Events

折线工具继承 `BaseTool` 的所有事件。详见 [事件系统](../guide/events)。

| 事件名 | 说明 | 回调参数 |
|--------|------|----------|
| `drawstart` | 开始绘制 | `{ feature }` |
| `drawend` | 绘制完成 | `{ feature }` |
| `select` | 选中要素 | `{ feature }` |
| `deselect` | 取消选中 | `{ features }` |
| `modifystart` | 开始拖拽顶点 | — |
| `modifyend` | 拖拽顶点结束 | `{ features }` |
| `delete` | 删除要素 | `{ feature }` |

## Methods

### 基础方法

| 方法名 | 说明 | 参数 | 返回值 |
|--------|------|------|--------|
| `addFeature(coords)` | 程序化添加折线 | `coords: number[][]` — 顶点数组 | `Feature` |
| `getFeatures()` | 获取所有要素 | — | `Feature[]` |
| `clearFeatures()` | 清空所有要素 | — | `this` |
| `on(event, handler)` | 注册事件监听 | `event: string`, `handler: Function` | `this` |
| `off(event, handler)` | 移除事件监听 | `event: string`, `handler: Function` | `this` |
| `destroy()` | 销毁工具实例 | — | `void` |

### 坐标方法

| 方法名 | 说明 | 参数 | 返回值 |
|--------|------|------|--------|
| `getCoordinates()` | 获取顶点坐标数组 | — | `number[][]` |
| `setCoordinates(coords)` | 设置全部顶点坐标 | `coords: number[][]` | `void` |
| `getPointCount()` | 获取顶点数量 | — | `number` |
| `updatePoint(index, coord)` | 更新指定顶点 | `index: number`, `coord: number[]` | `void` |

## 使用示例

### 基础绘制

```ts
import { LineTool } from 'ol-plot'

const tool = new LineTool(map, {
  strokeColor: '#1890ff',
  strokeWidth: 3,
})
```

### 虚线样式

```ts
import { LineTool } from 'ol-plot'

const tool = new LineTool(map, {
  strokeColor: '#722ed1',
  strokeWidth: 2,
  lineDash: [10, 5], // 10px 实线 + 5px 间隔
})
```

### 程序化添加折线

```ts
const tool = new LineTool(map)

tool.addFeature([
  [12958000, 4857000],
  [12968000, 4858000],
  [12975000, 4856000],
])

// 获取坐标
const coords = tool.getCoordinates()
// [[12958000, 4857000], [12968000, 4858000], [12975000, 4856000]]
```

### 监听编辑事件

```ts
import { LineTool, DrawEvent } from 'ol-plot'

const tool = new LineTool(map)

tool
  .on(DrawEvent.DRAW_END, ({ feature }) => {
    console.log('折线绘制完成，顶点数：', tool.getPointCount())
  })
  .on(DrawEvent.MODIFY_END, ({ features }) => {
    console.log('折线已更新，新坐标：', tool.getCoordinates())
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
