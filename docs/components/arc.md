---
title: 弓形
---

# 弓形 Arc

用于在地图上绘制圆弧线段。通过三个控制点确定：起点、终点和弧上一点（通过三点定弧）。

## 基础用法

绘制时依次点击三个点确定圆弧：起点 → 终点 → 弧上经过点。编辑时显示 3 个控制点。

<demo vue="../examples/arc/basic.vue" />

## 绘制行为

- **绘制方式**：依次点击 3 个点（起点 → 终点 → 圆弧经过点），完成绘制
- **几何类型**：`ol/geom/LineString`（由多点组成的圆弧段）
- **坐标表示**：3 个控制点 — 起点 + 终点 + 弧上经过点

## 编辑行为

使用**自定义 Handle 编辑模式**（禁用默认 ModifyManager），仅暴露 3 个控制点供编辑：

- 拖拽起点 → 改变圆弧起始位置
- 拖拽终点 → 改变圆弧结束位置
- 拖拽中间点 → 改变圆弧弯曲程度
- 拖拽任意控制点时重新计算圆弧几何

## 控制点

| 控制点 | 说明 |
|--------|------|
| P0 | 圆弧起点 |
| P1 | 圆弧终点 |
| P2 | 圆弧经过点（确定弧的弯曲方向和程度） |

编辑状态下仅显示上述三个控制点。

## Attributes

参见 [PlotConfig 类型定义](#类型声明)。

## Events

弓形工具继承 `BaseTool` 的所有事件。详见 [事件系统](../guide/events)。

| 事件名 | 说明 | 回调参数 |
|--------|------|----------|
| `drawstart` | 开始绘制第一个点 | `{ feature }` |
| `drawend` | 完成弓形绘制 | `{ feature }` |
| `select` | 选中要素 | `{ feature }` |
| `deselect` | 取消选中 | `{ features }` |
| `modifystart` | 开始拖拽控制点 | — |
| `modifyend` | 拖拽控制点结束 | `{ features }` |
| `delete` | 删除要素 | `{ feature }` |

## Methods

### 基础方法

| 方法名 | 说明 | 参数 | 返回值 |
|--------|------|------|--------|
| `addFeature(coords)` | 程序化添加弓形 | `coords: number[][]` — [start, end, pointOnArc] | `Feature` |
| `getFeatures()` | 获取所有要素 | — | `Feature[]` |
| `clearFeatures()` | 清空所有要素 | — | `this` |
| `on(event, handler)` | 注册事件监听 | `event: string`, `handler: Function` | `this` |
| `off(event, handler)` | 移除事件监听 | `event: string`, `handler: Function` | `this` |
| `destroy()` | 销毁工具实例 | — | `void` |

### 坐标方法

| 方法名 | 说明 | 参数 | 返回值 |
|--------|------|------|--------|
| `getCoordinates()` | 获取三个控制点坐标 | — | `number[][]` |
| `setCoordinates(coords)` | 设置控制点并重新计算圆弧 | `coords: number[][]` | `void` |
| `getPointCount()` | 获取控制点数量 | — | `number`（固定返回 3） |
| `updatePoint(index, coord)` | 更新指定控制点（0/1/2） | `index: number`, `coord: number[]` | `void` |

### 便捷方法

| 方法名 | 说明 | 参数 | 返回值 |
|--------|------|------|--------|
| `addArc(start, end, pointOnArc)` | 程序化添加弓形 | `start: number[]`, `end: number[]`, `pointOnArc: number[]` | `Feature` |
| `getStart()` | 获取起点坐标 | — | `number[] \| null` |
| `getEnd()` | 获取终点坐标 | — | `number[] \| null` |
| `getPointOnArc()` | 获取弧上经过点坐标 | — | `number[] \| null` |

## 使用示例

### 基础绘制

```ts
import { ArcTool } from 'ol-plot'

const tool = new ArcTool(map, {
  strokeColor: '#13c2c2',
  strokeWidth: 3,
})
```

### 程序化添加弓形

```ts
const tool = new ArcTool(map)

tool.addArc(
  [12958000, 4857000], // 起点
  [12975000, 4856000], // 终点
  [12965000, 4858000], // 弧上经过点
)

// 获取控制点
console.log('起点：', tool.getStart())
console.log('终点：', tool.getEnd())
console.log('弧上点：', tool.getPointOnArc())
```

### 自定义样式

```ts
import { ArcTool } from 'ol-plot'

const tool = new ArcTool(map, {
  strokeColor: '#2f54eb',
  strokeWidth: 2,
  lineDash: [6, 3],
  nodeStyle: {
    radius: 5,
    fill: '#fff',
    stroke: '#2f54eb',
    strokeWidth: 2,
  },
})
```

### 监听事件

```ts
import { ArcTool, DrawEvent } from 'ol-plot'

const tool = new ArcTool(map)

tool
  .on(DrawEvent.DRAW_END, ({ feature }) => {
    console.log('弓形绘制完成')
    console.log('控制点：', tool.getCoordinates())
  })
  .on(DrawEvent.MODIFY_END, ({ features }) => {
    console.log('弓形已更新')
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
