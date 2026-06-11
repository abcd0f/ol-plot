---
title: API 参考
---

# API 参考

## 通用接口

所有工具类均继承自 `BaseTool`，构造签名相同：

```ts
new XxxTool(map: Map, config?: PlotConfig)
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `map` | `ol/Map` | OpenLayers 地图实例 |
| `config` | `PlotConfig` | 可选，样式配置，未传时使用 `DEFAULT_CONFIG` |

---

## BaseTool

所有工具的抽象基类，提供完整的生命周期、要素管理和事件订阅能力。

### 要素管理

| 方法 | 说明 | 参数 | 返回值 |
|------|------|------|--------|
| `addFeature(coordinates)` | 以坐标数组创建要素并添加到图层 | `coordinates: number[][]` | `Feature` |
| `getFeatures()` | 返回图层中所有要素 | — | `Feature[]` |
| `clearFeatures()` | 清空图层中所有要素，取消选中状态 | — | `this` |

### 事件订阅

| 方法 | 说明 | 参数 | 返回值 |
|------|------|------|--------|
| `on(event, handler)` | 注册事件监听 | `event: string`, `handler: Function` | `this` |
| `off(event, handler)` | 移除事件监听 | `event: string`, `handler: Function` | `this` |

```ts
tool
  .on(DrawEvent.DRAW_END, ({ feature }) => { /* 绘制完成 */ })
  .on(DrawEvent.SELECT, ({ feature }) => { /* 选中要素 */ })
  .on(DrawEvent.MODIFY_END, ({ features }) => { /* 编辑完成 */ })
```

### 抽象方法（子类实现）

| 方法 | 说明 | 参数 | 返回值 |
|------|------|------|--------|
| `createGeometry(coordinates)` | 从坐标数组构建对应类型的 OL Geometry | `coordinates: number[][]` | `Geometry` |
| `setCoordinates(coordinates)` | 设置当前选中要素的坐标 | `coordinates: number[][]` | `void` |
| `getCoordinates()` | 获取当前选中要素的坐标 | — | `number[][]` |
| `getPointCount()` | 获取控制点数量 | — | `number` |
| `updatePoint(index, coordinate)` | 更新指定索引的控制点 | `index: number`, `coordinate: number[]` | `void` |

### 生命周期

| 方法 | 说明 | 返回值 |
|------|------|--------|
| `destroy()` | 销毁工具，移除所有 OL interaction、图层和事件监听 | `void` |

---

## 点 PointTool

绘制单个点标记。

```ts
import { PointTool } from 'ol-plot'
const tool = new PointTool(map)
```

### 专属方法

| 方法 | 说明 | 参数 | 返回值 |
|------|------|------|--------|
| `getPosition()` | 获取点坐标 | — | `number[] \| null` |

**绘制方式：** 单击地图放置点

**几何类型：** `ol/geom/Point`

---

## 折线 LineTool

绘制折线、路径线。

```ts
import { LineTool } from 'ol-plot'
const tool = new LineTool(map)
```

**绘制方式：** 单击添加顶点，双击结束

**几何类型：** `ol/geom/LineString`

`getCoordinates()` 返回所有顶点，`getPointCount()` 返回顶点数量。

---

## 自由线 FreehandLineTool

按住拖动绘制自由轨迹。

```ts
import { FreehandLineTool } from 'ol-plot'
const tool = new FreehandLineTool(map)
```

**绘制方式：** 按住鼠标拖动，松开结束

**几何类型：** `ol/geom/LineString`

API 与 `LineTool` 完全相同。

---

## 多边形 PolygonTool

绘制任意多边形区域。

```ts
import { PolygonTool } from 'ol-plot'
const tool = new PolygonTool(map, {
  strokeColor: '#52c41a',
  fillColor: 'rgba(82, 196, 26, 0.15)',
})
```

**绘制方式：** 单击添加顶点，双击（或点击起始点）闭合

**几何类型：** `ol/geom/Polygon`

::: tip 注意
`getCoordinates()` 返回的坐标**不含**闭合点（首尾不重复）。`updatePoint(0, coord)` 更新首点时，闭合点自动同步。
:::

---

## 矩形 RectangleTool

绘制轴对齐矩形区域。

```ts
import { RectangleTool } from 'ol-plot'
const tool = new RectangleTool(map)
```

**绘制方式：** 按住拖拽确定对角点，松开完成

**几何类型：** `ol/geom/Polygon`

**编辑方式：** 自定义 Handle（2 个对角控制点），拖拽时自动保持矩形约束

### 专属方法

| 方法 | 说明 | 参数 | 返回值 |
|------|------|------|--------|
| `addRectangle(start, end)` | 程序化添加矩形 | `start: number[]`, `end: number[]` | `Feature` |
| `getCenter()` | 获取矩形中心点 | — | `number[] \| null` |
| `getWidth()` | 获取矩形宽度 | — | `number` |
| `getHeight()` | 获取矩形高度 | — | `number` |

---

## 圆 CircleTool

绘制圆形区域。

```ts
import { CircleTool } from 'ol-plot'
const tool = new CircleTool(map)
```

**绘制方式：** 按住拖拽，起点为圆心，终点确定半径

**几何类型：** `ol/geom/Circle`

### 专属方法

| 方法 | 说明 | 参数 | 返回值 |
|------|------|------|--------|
| `addCircle(center, radius)` | 程序化添加圆形 | `center: number[]`, `radius: number` | `Feature` |
| `getCenter()` | 获取圆心 | — | `number[] \| null` |
| `getRadius()` | 获取半径 | — | `number` |
| `setCenter(center)` | 设置圆心 | `center: number[]` | `void` |
| `setRadius(radius)` | 设置半径 | `radius: number` | `void` |

---

## 椭圆 EllipseTool

绘制椭圆区域。

```ts
import { EllipseTool } from 'ol-plot'
const tool = new EllipseTool(map)
```

**绘制方式：** 按住拖拽确定外接矩形对角点，松开完成

**几何类型：** `ol/geom/Polygon`（64 段近似椭圆弧）

**编辑方式：** 自定义 Handle（2 个对角控制点）

### 专属方法

| 方法 | 说明 | 参数 | 返回值 |
|------|------|------|--------|
| `addEllipse(p1, p2)` | 程序化添加椭圆 | `p1: number[]`, `p2: number[]` | `Feature` |
| `getCenter()` | 获取椭圆中心点 | — | `number[] \| null` |
| `getRadii()` | 获取两个半轴长度 [rx, ry] | — | `[number, number] \| null` |

---

## 扇形 SectorTool

绘制扇形区域。

```ts
import { SectorTool } from 'ol-plot'
const tool = new SectorTool(map)
```

**绘制方式：** 依次点击 3 个点（圆心 → 起始点 → 结束点）

**几何类型：** `ol/geom/Polygon`

**编辑方式：** 自定义 Handle（3 个控制点）

### 专属方法

| 方法 | 说明 | 参数 | 返回值 |
|------|------|------|--------|
| `addSector(center, radiusPoint, anglePoint)` | 程序化添加扇形 | `center: number[]`, `radiusPoint: number[]`, `anglePoint: number[]` | `Feature` |
| `getCenter()` | 获取圆心 | — | `number[] \| null` |
| `getRadius()` | 获取半径 | — | `number` |
| `getAngles()` | 获取起止角度（弧度） | — | `{ start: number; end: number } \| null` |

---

## 弓形 ArcTool

绘制圆弧线段。

```ts
import { ArcTool } from 'ol-plot'
const tool = new ArcTool(map)
```

**绘制方式：** 依次点击 3 个点（起点 → 终点 → 弧上经过点）

**几何类型：** `ol/geom/LineString`

**编辑方式：** 自定义 Handle（3 个控制点）

### 专属方法

| 方法 | 说明 | 参数 | 返回值 |
|------|------|------|--------|
| `addArc(start, end, pointOnArc)` | 程序化添加弓形 | `start: number[]`, `end: number[]`, `pointOnArc: number[]` | `Feature` |
| `getStart()` | 获取起点 | — | `number[] \| null` |
| `getEnd()` | 获取终点 | — | `number[] \| null` |
| `getPointOnArc()` | 获取弧上经过点 | — | `number[] \| null` |

---

## 直箭头 StraightArrowTool

绘制矩形箭身 + 三角形箭头的直线箭头。

```ts
import { StraightArrowTool } from 'ol-plot'
const tool = new StraightArrowTool(map)
```

**绘制方式：** 按住拖拽，起点为箭尾中心，终点为箭头尖端

**几何类型：** `ol/geom/Polygon`

**编辑方式：** 自定义 Handle（2 个控制点）

### 专属方法

| 方法 | 说明 | 参数 | 返回值 |
|------|------|------|--------|
| `addArrow(start, end)` | 程序化添加箭头 | `start: number[]`, `end: number[]` | `Feature` |
| `getStart()` | 获取箭尾中心点 | — | `number[] \| null` |
| `getEnd()` | 获取箭头尖端点 | — | `number[] \| null` |
| `getLength()` | 获取箭头长度 | — | `number` |

---

## 斜箭头 TaperedArrowTool

绘制渐缩箭身（尾部到头部逐渐变宽）的箭头。

```ts
import { TaperedArrowTool } from 'ol-plot'
const tool = new TaperedArrowTool(map)
```

**绘制方式：** 按住拖拽，起点为箭尾中心，终点为箭头尖端

**几何类型：** `ol/geom/Polygon`

**编辑方式：** 自定义 Handle（2 个控制点）

API 与 `StraightArrowTool` 相同。

---

## 线箭头 LineArrowTool

绘制线条箭身 + 实心三角形箭头的线型箭头。

```ts
import { LineArrowTool } from 'ol-plot'
const tool = new LineArrowTool(map)
```

**绘制方式：** 按住拖拽，起点为箭尾，终点为箭头尖端

**几何类型：** `ol/geom/GeometryCollection`（LineString + Polygon）

**编辑方式：** 自定义 Handle（2 个控制点）

API 与 `StraightArrowTool` 相同。

---

## 常量

### DrawType

绘制类型枚举。

```ts
import { DrawType } from 'ol-plot'
```

| 枚举值 | 字符串 | 说明 |
|--------|--------|------|
| `DrawType.Point` | `'Point'` | 点 |
| `DrawType.Line` | `'LineString'` | 折线 |
| `DrawType.FreehandLine` | `'FreehandLine'` | 自由线 |
| `DrawType.Polygon` | `'Polygon'` | 多边形 |
| `DrawType.Rectangle` | `'Rectangle'` | 矩形 |
| `DrawType.Circle` | `'Circle'` | 圆形 |
| `DrawType.Ellipse` | `'Ellipse'` | 椭圆 |
| `DrawType.Sector` | `'Sector'` | 扇形 |
| `DrawType.Arc` | `'Arc'` | 弓形 |
| `DrawType.StraightArrow` | `'StraightArrow'` | 直箭头 |
| `DrawType.TaperedArrow` | `'TaperedArrow'` | 斜箭头 |
| `DrawType.LineArrow` | `'LineArrow'` | 线箭头 |

### DrawEvent

事件名称常量。

```ts
import { DrawEvent } from 'ol-plot'
```

| 常量 | 字符串值 | 触发时机 | 回调参数 |
|------|----------|----------|----------|
| `DrawEvent.DRAW_START` | `'drawstart'` | 开始绘制 | `{ feature: Feature }` |
| `DrawEvent.DRAW_END` | `'drawend'` | 完成一次绘制 | `{ feature: Feature }` |
| `DrawEvent.DRAW_ABORT` | `'drawabort'` | 绘制被中止 | — |
| `DrawEvent.MODIFY_START` | `'modifystart'` | 开始拖拽控制点 | — |
| `DrawEvent.MODIFY_END` | `'modifyend'` | 拖拽控制点结束 | `{ features: Feature[] }` |
| `DrawEvent.SELECT` | `'select'` | 点击选中要素 | `{ feature: Feature }` |
| `DrawEvent.DESELECT` | `'deselect'` | 取消选中 | `{ features: Feature[] }` |
| `DrawEvent.DELETE` | `'delete'` | 删除选中要素 | `{ feature: Feature }` |

### ToolState

工具状态枚举。

| 枚举值 | 说明 |
|--------|------|
| `ToolState.Idle` | 未初始化或已销毁 |
| `ToolState.Drawing` | 绘制态，点击空白区域可开始绘制 |
| `ToolState.Editing` | 编辑态，可拖拽控制点修改图形 |

### DEFAULT_CONFIG

默认样式配置。

```ts
import { DEFAULT_CONFIG } from 'ol-plot'
```

```ts
const DEFAULT_CONFIG: Required<PlotConfig> = {
  strokeColor: '#2196f3',
  strokeWidth: 2,
  fillColor: 'rgba(33, 150, 243, 0.15)',
  lineDash: [],
  nodeStyle: {
    radius: 6,
    fill: '#ffffff',
    stroke: '#2196f3',
    strokeWidth: 2,
  },
}
```

---

## 类型定义

### PlotConfig

```ts
interface PlotConfig {
  /** 线条颜色，默认 '#2196f3' */
  strokeColor?: string
  /** 线条宽度（像素），默认 2 */
  strokeWidth?: number
  /** 填充颜色，默认 'rgba(33,150,243,0.15)' */
  fillColor?: string
  /** 虚线样式，如 [10, 5]，默认 []（实线） */
  lineDash?: number[]
  /** 控制点样式 */
  nodeStyle?: NodeStyle
}
```

### NodeStyle

```ts
interface NodeStyle {
  /** 控制点半径（像素），默认 6 */
  radius?: number
  /** 控制点填充色，默认 '#ffffff' */
  fill?: string
  /** 控制点描边色，默认同 strokeColor */
  stroke?: string
  /** 控制点描边宽度（像素），默认 2 */
  strokeWidth?: number
}
```

### DrawEventType

```ts
type DrawEventType = 'drawstart' | 'drawend' | 'drawabort' | 'modifystart' | 'modifyend' | 'select' | 'deselect' | 'delete'
```

---

## 核心类

以下类为内部实现，可按需单独引入进行二次开发。

### EventBus

内部事件总线，基于 OL 的 `Target` / `BaseEvent` 实现。

```ts
import { EventBus } from 'ol-plot'
```

| 方法 | 说明 |
|------|------|
| `bus.on(event, handler)` | 注册事件监听 |
| `bus.off(event, handler)` | 移除事件监听 |
| `bus.emit(event, ...args)` | 触发事件 |
| `bus.clear()` | 移除所有监听器 |

### LayerManager

管理 VectorLayer + VectorSource 组合。

| 方法 | 说明 |
|------|------|
| `getSource()` | 获取矢量数据源 |
| `getLayer()` | 获取矢量图层 |
| `getFeatures()` | 获取所有要素 |
| `addFeature(feature)` | 添加要素 |
| `removeFeature(feature)` | 移除要素 |
| `clear()` | 清空所有要素 |
| `destroy()` | 从地图移除图层 |

### DrawManager

OL Draw interaction 管理器，实现条件协调逻辑。

### SelectManager

OL Select interaction 管理器，管理要素选中/取消选中。

### ModifyManager

OL Modify interaction 管理器，绑定到选中要素集合进行顶点编辑。
