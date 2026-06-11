---
title: 矩形
---

# 矩形 Rectangle

用于在地图上绘制轴对齐矩形区域。按住拖拽确定对角点，内部维护矩形形状约束，确保任意顶点拖拽后仍是矩形。

## 基础用法

按住鼠标拖拽绘制矩形，从起点到对角点松开鼠标即完成。绘制完成后自动进入编辑态，四个角点可拖拽编辑。

<demo vue="../examples/rectangle/rectangle-basic.vue" />

## 绘制行为

- **绘制方式**：按住拖拽，起点和对角点确定矩形，松开鼠标完成
- **几何类型**：`ol/geom/Polygon`（五顶点：BL, TL, TR, BR, 闭合点）
- **矩形约束**：绘制完成后，拖拽任意角点时相邻角点自动跟随，保持矩形形状

## 编辑行为

使用**自定义 Handle 编辑模式**（禁用默认 ModifyManager），通过独立的 handle 图层暴露 2 个控制点（对角点）：

- 选中要素时显示 2 个控制点
- 拖拽控制点时内部自动计算四个角点并更新矩形
- 取消选中时隐藏控制点

## 控制点

| 控制点 | 说明 |
|--------|------|
| P0 | 矩形起始角点（对角点之一） |
| P1 | 矩形结束角点（对角点之二） |

编辑状态下仅显示上述两个控制点。矩形的四个实际角点由这两个对角点自动计算。

## Attributes

参见 [PlotConfig 类型定义](#类型声明)。

## Events

矩形工具继承 `BaseTool` 的所有事件。详见 [事件系统](../guide/events)。

| 事件名 | 说明 | 回调参数 |
|--------|------|----------|
| `drawstart` | 按下鼠标开始拖拽 | `{ feature }` |
| `drawend` | 松开鼠标完成矩形 | `{ feature }` |
| `select` | 选中要素 | `{ feature }` |
| `deselect` | 取消选中 | `{ features }` |
| `modifystart` | 开始拖拽控制点 | — |
| `modifyend` | 拖拽控制点结束 | `{ features }` |
| `delete` | 删除要素 | `{ feature }` |

## Methods

### 基础方法

| 方法名 | 说明 | 参数 | 返回值 |
|--------|------|------|--------|
| `addFeature(coords)` | 程序化添加矩形 | `coords: number[][]` — 两个对角点 | `Feature` |
| `getFeatures()` | 获取所有要素 | — | `Feature[]` |
| `clearFeatures()` | 清空所有要素 | — | `this` |
| `on(event, handler)` | 注册事件监听 | `event: string`, `handler: Function` | `this` |
| `off(event, handler)` | 移除事件监听 | `event: string`, `handler: Function` | `this` |
| `destroy()` | 销毁工具实例 | — | `void` |

### 坐标方法

| 方法名 | 说明 | 参数 | 返回值 |
|--------|------|------|--------|
| `getCoordinates()` | 获取两个对角控制点 | — | `number[][]` |
| `setCoordinates(coords)` | 设置对角控制点并重新计算矩形 | `coords: number[][]` | `void` |
| `getPointCount()` | 获取控制点数量 | — | `number`（固定返回 2） |
| `updatePoint(index, coord)` | 更新指定控制点 | `index: number` (0 或 1), `coord: number[]` | `void` |

### 便捷方法

| 方法名 | 说明 | 参数 | 返回值 |
|--------|------|------|--------|
| `addRectangle(start, end)` | 程序化添加矩形 | `start: number[]`, `end: number[]` | `Feature` |
| `getCenter()` | 获取矩形中心点 | — | `number[] \| null` |
| `getWidth()` | 获取矩形宽度 | — | `number` |
| `getHeight()` | 获取矩形高度 | — | `number` |

## 使用示例

### 基础绘制

```ts
import { RectangleTool } from 'ol-plot'

const tool = new RectangleTool(map, {
  strokeColor: '#fa8c16',
  strokeWidth: 2,
  fillColor: 'rgba(250, 140, 22, 0.15)',
})
```

### 程序化添加矩形

```ts
const tool = new RectangleTool(map)

tool.addRectangle(
  [12958000, 4857000], // 起点（对角点1）
  [12975000, 4859000], // 终点（对角点2）
)

// 获取矩形信息
console.log('中心点：', tool.getCenter())
console.log('宽度：', tool.getWidth())
console.log('高度：', tool.getHeight())
```

### 监听绘制和编辑

```ts
import { RectangleTool, DrawEvent } from 'ol-plot'

const tool = new RectangleTool(map)

tool
  .on(DrawEvent.DRAW_END, ({ feature }) => {
    const coords = tool.getCoordinates()
    console.log('控制点：', coords)
    console.log('中心：', tool.getCenter())
  })
  .on(DrawEvent.MODIFY_END, ({ features }) => {
    console.log('矩形已更新')
  })
```

### 自定义样式

```ts
import { RectangleTool } from 'ol-plot'

const tool = new RectangleTool(map, {
  strokeColor: '#eb2f96',
  strokeWidth: 3,
  fillColor: 'rgba(235, 47, 150, 0.1)',
  lineDash: [8, 4],
  nodeStyle: {
    radius: 7,
    fill: '#fff',
    stroke: '#eb2f96',
    strokeWidth: 2,
  },
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
