# ol-plot

基于 OpenLayers 的矢量图形标绘工具库，提供绘制、选择、编辑的全生命周期管理。实例化即可使用，无需手动切换交互模式。

## 特性

- **丰富的绘图工具** — 点、线、自由线、多边形、矩形、圆、椭圆、扇形、弓形、旗标，以及直箭头、斜箭头、线箭头、双箭头等 14 种工具。
- **开箱即用的交互** — 实例化即进入绘制态，自动协调 绘制 → 选择 → 编辑 三种交互，无需手动切换。支持拖拽顶点编辑与键盘删除。
- **灵活的样式配置** — 线色、线宽、虚线、填充色、控制点样式均可自定义。
- **事件驱动架构** — 统一的事件系统覆盖绘制、选择、编辑、删除全流程。
- **完整的 TypeScript 类型** — 提供智能提示与类型安全。
- **模块化设计** — 核心模块、几何计算、样式工厂职责分离，便于扩展。

## 安装

`ol-plot` 依赖 OpenLayers 作为 peer dependency（`ol >= 10.8.0`），请确保项目中已安装 `ol`。

```bash
# pnpm
pnpm add @seedlib/ol-plot ol

# npm
npm install @seedlib/ol-plot ol

# yarn
yarn add @seedlib/ol-plot ol
```

## 快速开始

工具在实例化后**自动进入绘制态**，无需调用任何激活方法。

```ts
import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import XYZ from 'ol/source/XYZ'
import { fromLonLat } from 'ol/proj'
import { LineTool, DrawEvent } from '@seedlib/ol-plot'

const map = new Map({
  target: 'map',
  layers: [
    new TileLayer({
      source: new XYZ({ url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png' }),
    }),
  ],
  view: new View({
    center: fromLonLat([116.3974, 39.9093]),
    zoom: 10,
  }),
})

const tool = new LineTool(map, {
  strokeColor: '#1890ff',
  strokeWidth: 3,
})

// 监听绘制完成
tool.on(DrawEvent.DRAW_END, ({ feature }) => {
  console.log('绘制完成:', tool.getCoordinates())
})

// 切换工具或组件卸载时销毁
// tool.destroy()
```

## 交互行为

| 操作 | 行为 |
|------|------|
| 点击**空白区域** | 开始绘制新图形 |
| 图形绘制**完成** | 自动选中并进入编辑态，显示控制点 |
| 点击**已有图形** | 切换选中该图形，进入编辑态 |
| 拖拽**控制点** | 修改图形形状 |
| 点击**空白区域**（有选中时） | 取消选中，保留图形 |
| 按 `Delete` / `Backspace` | 删除当前选中的图形 |

## 绘图工具

| 工具 | 几何类型 | 绘制方式 |
|------|----------|----------|
| `PointTool` | Point | 单击放置点 |
| `LineTool` | LineString | 单击添加顶点，双击结束 |
| `FreehandLineTool` | LineString | 按住拖动，松开结束 |
| `PolygonTool` | Polygon | 单击添加顶点，双击闭合 |
| `RectangleTool` | Polygon | 拖拽确定对角点 |
| `CircleTool` | Circle | 拖拽，起点为圆心，终点定半径 |
| `EllipseTool` | Polygon | 拖拽确定外接矩形对角点 |
| `SectorTool` | Polygon | 依次点击 3 点（圆心 → 起点 → 终点） |
| `ArcTool` | LineString | 依次点击 3 点（起点 → 终点 → 弧上点） |
| `FlagTool` | Polygon | 拖拽绘制旗标 |
| `StraightArrowTool` | Polygon | 拖拽，起点为箭尾，终点为箭尖 |
| `TaperedArrowTool` | Polygon | 拖拽，渐缩箭身 |
| `LineArrowTool` | GeometryCollection | 拖拽，线型箭身 + 三角箭头 |
| `DoubleArrowTool` | Polygon | 多点绘制的双向燕尾箭头 |

## 事件

使用 `on()` / `off()` 订阅与移除监听，均返回 `this` 支持链式调用。

```ts
tool
  .on(DrawEvent.DRAW_START, ({ feature }) => {})
  .on(DrawEvent.DRAW_END, ({ feature }) => {})
  .on(DrawEvent.SELECT, ({ feature }) => {})
  .on(DrawEvent.DESELECT, ({ features }) => {})
  .on(DrawEvent.MODIFY_END, ({ features }) => {})
  .on(DrawEvent.DELETE, ({ feature }) => {})
```

| 事件常量 | 字符串值 | 触发时机 | 回调参数 |
|----------|----------|----------|----------|
| `DrawEvent.DRAW_START` | `drawstart` | 开始绘制 | `{ feature }` |
| `DrawEvent.DRAW_END` | `drawend` | 完成一次绘制 | `{ feature }` |
| `DrawEvent.DRAW_ABORT` | `drawabort` | 绘制被中止 | — |
| `DrawEvent.MODIFY_START` | `modifystart` | 开始拖拽控制点 | — |
| `DrawEvent.MODIFY_END` | `modifyend` | 拖拽控制点结束 | `{ features }` |
| `DrawEvent.SELECT` | `select` | 点击选中要素 | `{ feature }` |
| `DrawEvent.DESELECT` | `deselect` | 取消选中 | `{ features }` |
| `DrawEvent.DELETE` | `delete` | 删除选中要素 | `{ feature }` |

一次典型流程的触发顺序：

```
点击空白开始绘制  → DRAW_START
完成绘制          → DRAW_END → SELECT（自动选中）
拖拽控制点        → MODIFY_START → MODIFY_END
点击空白取消选中  → DESELECT（回到绘制态）
```

## 通用 API

所有工具继承自 `BaseTool`，构造签名一致：

```ts
new XxxTool(map: Map, config?: PlotConfig)
```

| 方法 | 说明 | 返回值 |
|------|------|--------|
| `addFeature(coordinates)` | 以坐标数组创建要素并添加到图层 | `Feature` |
| `getFeatures()` | 返回图层中所有要素 | `Feature[]` |
| `getCoordinates()` | 获取当前选中要素的坐标 | `number[][]` |
| `setCoordinates(coordinates)` | 设置当前选中要素的坐标 | `void` |
| `getPointCount()` | 获取控制点数量 | `number` |
| `updatePoint(index, coordinate)` | 更新指定索引的控制点 | `void` |
| `clearFeatures()` | 清空所有要素并回到绘制态 | `this` |
| `getState()` | 获取当前状态（Idle / Drawing / Editing） | `ToolState` |
| `on(event, handler)` | 注册事件监听 | `this` |
| `off(event, handler)` | 移除事件监听 | `this` |
| `destroy()` | 销毁工具，移除所有 interaction、图层和监听 | `void` |

部分工具提供专属方法（如 `CircleTool` 的 `getRadius()` / `setRadius()`、`RectangleTool` 的 `getWidth()` 等），详见 API 文档。

## 配置项

```ts
interface PlotConfig {
  strokeColor?: string    // 线条颜色，默认 '#2196f3'
  strokeWidth?: number    // 线条宽度（像素），默认 2
  fillColor?: string      // 填充颜色，默认 'rgba(33,150,243,0.15)'
  lineDash?: number[]     // 虚线样式，如 [10, 5]，默认 []（实线）
  nodeStyle?: NodeStyle   // 控制点样式
}

interface NodeStyle {
  radius?: number         // 控制点半径，默认 6
  fill?: string           // 填充色，默认 '#ffffff'
  stroke?: string         // 描边色，默认同 strokeColor
  strokeWidth?: number    // 描边宽度，默认 2
}
```

## 文档

完整的组件文档、事件说明与 API 参考见 `docs/` 目录，可在本地启动：

```bash
pnpm dev:docs
```

## 开发

```bash
pnpm install       # 安装依赖
pnpm build         # 构建 ESM + IIFE 产物
pnpm lint:fix      # 代码检查并修复
pnpm format:write  # 格式化
```

## License

ISC © wlt
