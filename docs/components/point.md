---
title: 点
---

# 点 Point

用于在地图上创建单个点标记要素，适用于标注点位、标记位置等场景。

## 基础用法

单击地图即可放置一个点要素。绘制完成后自动选中，支持拖拽编辑位置。

<demo vue="../examples/point/basic.vue" />

## 绘制行为

- **绘制方式**：单击地图放置点
- **几何类型**：`ol/geom/Point`
- **样式特点**：使用 Circle 样式渲染（`image` 而非 `stroke`/`fill`），因为 Point 几何需要 image 样式才能在地图上可见

## 编辑行为

选中状态下可拖拽唯一的控制点改变点的位置。

## 控制点

| 控制点 | 说明 |
|--------|------|
| P0 | 点的位置坐标 |

## Attributes

| 属性名 | 说明 | 类型 | 默认值 |
|--------|------|------|--------|
| `map` | OpenLayers 地图实例 | `Map` | —（必填） |
| `config` | 样式配置项 | `PlotConfig` | `DEFAULT_CONFIG` |

::: details PlotConfig 类型定义
```ts
interface PlotConfig {
  strokeColor?: string      // 线颜色，默认 '#2196f3'
  strokeWidth?: number      // 线宽度，默认 2
  fillColor?: string        // 填充色，默认 'rgba(33, 150, 243, 0.15)'
  lineDash?: number[]       // 虚线配置，默认 []（实线）
  nodeStyle?: NodeStyle     // 控制点样式
}

interface NodeStyle {
  radius?: number           // 控制点半径，默认 6
  fill?: string             // 控制点填充色，默认 '#ffffff'
  stroke?: string           // 控制点描边色，默认 '#2196f3'
  strokeWidth?: number      // 控制点描边宽度，默认 2
}
```
:::

## Events

点工具继承 `BaseTool` 的所有事件。详见 [事件系统](../guide/events)。

| 事件名 | 说明 | 回调参数 |
|--------|------|----------|
| `drawstart` | 开始绘制 | `{ feature }` |
| `drawend` | 绘制完成 | `{ feature }` |
| `select` | 选中要素 | `{ feature }` |
| `deselect` | 取消选中 | `{ features }` |
| `modifystart` | 开始拖拽 | — |
| `modifyend` | 拖拽结束 | `{ features }` |
| `delete` | 删除要素 | `{ feature }` |

## Methods

### 基础方法

| 方法名 | 说明 | 参数 | 返回值 |
|--------|------|------|--------|
| `addFeature(coords)` | 程序化添加要素 | `coords: number[][]` — 坐标数组 | `Feature` |
| `getFeatures()` | 获取所有要素 | — | `Feature[]` |
| `clearFeatures()` | 清空所有要素 | — | `this` |
| `on(event, handler)` | 注册事件监听 | `event: string`, `handler: Function` | `this` |
| `off(event, handler)` | 移除事件监听 | `event: string`, `handler: Function` | `this` |
| `destroy()` | 销毁工具实例 | — | `void` |

### 坐标方法

| 方法名 | 说明 | 参数 | 返回值 |
|--------|------|------|--------|
| `getCoordinates()` | 获取当前选中要素的坐标 | — | `number[][]` |
| `setCoordinates(coords)` | 设置当前选中要素的坐标 | `coords: number[][]` | `void` |
| `getPointCount()` | 获取控制点数量 | — | `number` |
| `updatePoint(index, coord)` | 更新指定控制点 | `index: number`, `coord: number[]` | `void` |

### 便捷方法

| 方法名 | 说明 | 参数 | 返回值 |
|--------|------|------|--------|
| `getPosition()` | 获取点坐标 | — | `number[] \| null` |

## 使用示例

### 基础绘制

```ts
import { PointTool } from 'ol-plot'

const tool = new PointTool(map, {
  strokeColor: '#52c41a',
  strokeWidth: 2,
  nodeStyle: { radius: 8, fill: '#fff', stroke: '#52c41a', strokeWidth: 2 },
})
```

### 程序化添加点

```ts
const tool = new PointTool(map)

// 添加一个点（坐标使用地图投影坐标系）
tool.addFeature([[12958000, 4857000]])

// 获取点坐标
console.log(tool.getPosition()) // [12958000, 4857000]
```

### 监听事件

```ts
import { PointTool, DrawEvent } from 'ol-plot'

const tool = new PointTool(map)

tool.on(DrawEvent.DRAW_END, ({ feature }) => {
  const position = tool.getPosition()
  console.log('点位置：', position)
  // 保存到后端...
})
```
