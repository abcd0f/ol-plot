---
title: 椭圆
---

# 椭圆 Ellipse

用于在地图上绘制椭圆区域。通过两个对角点确定外接矩形，内部自动计算椭圆几何。

## 基础用法

按住鼠标拖拽确定椭圆外接矩形的对角点，松开鼠标完成绘制。编辑时仅显示 2 个控制点。

<demo vue="../examples/ellipse/base.vue" />

## 绘制行为

- **绘制方式**：按住拖拽，起点和终点确定椭圆外接矩形对角点，松开鼠标完成
- **几何类型**：`ol/geom/Polygon`（64 段 Polygon 近似椭圆弧）
- **坐标表示**：2 个控制点代表外接矩形对角点

## 编辑行为

使用**自定义 Handle 编辑模式**（禁用默认 ModifyManager）。椭圆由 64 段 Polygon 近似表示，顶点过多无法直接编辑，因此只暴露 2 个控制点供拖拽：

- 选中要素时显示 2 个控制点（对角点）
- 拖拽任意控制点时重新计算椭圆几何
- 取消选中时隐藏控制点

## 控制点

| 控制点 | 说明 |
|--------|------|
| P0 | 椭圆外接矩形的一个对角点 |
| P1 | 椭圆外接矩形的另一个对角点 |

## Attributes

参见 [PlotConfig 类型定义](#类型声明)。

## Events

椭圆工具继承 `BaseTool` 的所有事件。详见 [事件系统](../guide/events)。

| 事件名 | 说明 | 回调参数 |
|--------|------|----------|
| `drawstart` | 按下鼠标开始拖拽 | `{ feature }` |
| `drawend` | 松开鼠标完成椭圆 | `{ feature }` |
| `select` | 选中要素 | `{ feature }` |
| `deselect` | 取消选中 | `{ features }` |
| `modifystart` | 开始拖拽控制点 | — |
| `modifyend` | 拖拽控制点结束 | `{ features }` |
| `delete` | 删除要素 | `{ feature }` |

## Methods

### 基础方法

| 方法名 | 说明 | 参数 | 返回值 |
|--------|------|------|--------|
| `addFeature(coords)` | 程序化添加椭圆 | `coords: number[][]` — 两个对角点 | `Feature` |
| `getFeatures()` | 获取所有要素 | — | `Feature[]` |
| `clearFeatures()` | 清空所有要素 | — | `this` |
| `on(event, handler)` | 注册事件监听 | `event: string`, `handler: Function` | `this` |
| `off(event, handler)` | 移除事件监听 | `event: string`, `handler: Function` | `this` |
| `destroy()` | 销毁工具实例 | — | `void` |

### 坐标方法

| 方法名 | 说明 | 参数 | 返回值 |
|--------|------|------|--------|
| `getCoordinates()` | 获取两个对角控制点 | — | `number[][]` |
| `setCoordinates(coords)` | 设置对角控制点并重新计算椭圆 | `coords: number[][]` | `void` |
| `getPointCount()` | 获取控制点数量 | — | `number`（固定返回 2） |
| `updatePoint(index, coord)` | 更新指定控制点 | `index: number` (0 或 1), `coord: number[]` | `void` |

### 便捷方法

| 方法名 | 说明 | 参数 | 返回值 |
|--------|------|------|--------|
| `addEllipse(p1, p2)` | 程序化添加椭圆 | `p1: number[]`, `p2: number[]` | `Feature` |
| `getCenter()` | 获取椭圆中心点 | — | `number[] \| null` |
| `getRadii()` | 获取椭圆两个半轴长度 | — | `[number, number] \| null` |

## 使用示例

### 基础绘制

```ts
import { EllipseTool } from 'ol-plot'

const tool = new EllipseTool(map, {
  strokeColor: '#722ed1',
  strokeWidth: 2,
  fillColor: 'rgba(114, 46, 209, 0.1)',
})
```

### 程序化添加椭圆

```ts
const tool = new EllipseTool(map)

tool.addEllipse(
  [12958000, 4857000], // 对角点 1
  [12975000, 4859000], // 对角点 2
)

// 获取椭圆参数
console.log('中心点：', tool.getCenter())
console.log('半轴：', tool.getRadii()) // [rx, ry]
```

### 监听编辑

```ts
import { EllipseTool, DrawEvent } from 'ol-plot'

const tool = new EllipseTool(map)

tool.on(DrawEvent.MODIFY_END, ({ features }) => {
  const [rx, ry] = tool.getRadii()!
  console.log(`椭圆已更新，半轴：[${rx}, ${ry}]`)
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
