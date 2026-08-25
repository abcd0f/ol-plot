# ol-plot

基于 OpenLayers 的矢量图形标绘工具库，提供绘制、选择、编辑、删除和测量的一体化交互。工具实例化后会自动进入绘制状态，并在绘制完成后自动选中图形进入编辑状态，适合直接集成到 GIS、地图标注、态势标绘和业务绘图场景中。

## 特性

- **工具丰富**：内置点、图片点、折线、流向线、自由线、自由面、多边形、矩形、圆、椭圆、扇形、弧线、旗标、箭头、方位角、测距和测面等工具。
- **开箱即用的交互**：自动协调 Draw、Select、Modify 三类 OpenLayers interaction，支持绘制后选中、点击切换选中、拖拽控制点编辑和键盘删除。
- **统一生命周期**：支持单工具 `BaseTool` 用法，也支持一个 `PlotManager` 管理多类型标绘、事件订阅、要素管理和销毁 API。
- **灵活样式配置**：支持线色、线宽、虚线、填充色、控制点样式、测量标签样式和流向线动画参数。
- **TypeScript 友好**：导出完整类型、事件常量、状态常量和默认配置。

## 安装

`@seedlib/ol-plot` 将 OpenLayers 作为 peer dependency，请同时安装 `ol >= 10.8.0`。

```bash
pnpm add @seedlib/ol-plot ol
```

也可以使用 npm 或 yarn：

```bash
npm install @seedlib/ol-plot ol
yarn add @seedlib/ol-plot ol
```

## 快速开始

工具创建后会立即进入绘制状态，无需额外调用 `start()` 或 `activate()`。

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
      source: new XYZ({
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      }),
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

tool.on(DrawEvent.DRAW_END, ({ feature }) => {
  console.log('绘制完成:', feature)
  console.log('当前坐标:', tool.getCoordinates())
})

// 切换工具或组件卸载时记得销毁
// tool.destroy()
```

如果页面需要同时支持多种标绘类型，推荐只创建一个 `PlotManager`，通过 `setActiveTool()` 切换当前绘制类型。这样地图上只维护一套图层和交互，不需要为每个工具类型都 `new` 一个实例。

```ts
import { PlotManager, DrawType, DrawEvent } from '@seedlib/ol-plot'

const plot = new PlotManager(map, {
  strokeColor: '#1890ff',
  strokeWidth: 3,
})

plot.setActiveTool(DrawType.Line)

toolbar.onChange((type: DrawType) => {
  plot.setActiveTool(type)
})

plot.on(DrawEvent.DRAW_END, ({ feature, data }) => {
  console.log('绘制完成:', feature)
  console.log('结构化数据:', data)
})

// 组件卸载时
// plot.destroy()
```

## 交互行为

| 操作 | 行为 |
| --- | --- |
| 点击空白区域 | 开始绘制新图形 |
| 完成图形绘制 | 自动选中新图形并进入编辑状态，显示控制点 |
| 点击已有图形 | 切换选中目标并进入编辑状态 |
| 拖拽控制点 | 修改图形形状 |
| 有选中图形时点击空白区域 | 取消选中，保留已绘制图形，并回到绘制状态 |
| 按 `Delete` / `Backspace` | 删除当前选中图形 |

## 工具列表

| 工具 | 几何类型 | 绘制方式 |
| --- | --- | --- |
| `PointTool` | `Point` | 单击放置点 |
| `ImagePointTool` | `Point` | 单击放置图片点 |
| `LineTool` | `LineString` | 单击添加顶点，双击结束 |
| `FlowLineTool` | `LineString` | 单击绘制带动画箭头的流向线 |
| `FreehandLineTool` | `LineString` | 点击起点，移动预览，点击终点结束 |
| `FreehandPolygonTool` | `Polygon` | 点击起点，移动采样边界，点击终点闭合成面 |
| `PolygonTool` | `Polygon` | 单击添加顶点，双击或闭合结束 |
| `RectangleTool` | `Polygon` | 拖拽确定对角点 |
| `CircleTool` | `Circle` | 拖拽确定圆心和半径 |
| `AzimuthTool` | `GeometryCollection` | 两点确定方向，显示距离和方位角，并以距离为半径绘制圆 |
| `EllipseTool` | `Polygon` | 拖拽确定外接矩形 |
| `SectorTool` | `Polygon` | 依次点击圆心、起始点、结束点 |
| `ArcTool` | `LineString` | 依次点击起点、终点、弧上点 |
| `FlagTool` | `Polygon` | 拖拽绘制旗标 |
| `StraightArrowTool` | `Polygon` | 拖拽绘制直箭头 |
| `TaperedArrowTool` | `Polygon` | 拖拽绘制渐缩箭头 |
| `LineArrowTool` | `GeometryCollection` | 拖拽绘制线型箭头 |
| `DoubleArrowTool` | `Polygon` | 多点绘制双箭头 |
| `MeasureTool` | `LineString` | 绘制折线并显示距离标签 |
| `AreaMeasureTool` | `Polygon` | 绘制区域并显示面积标签 |

## 常用 API

所有工具类的构造方式保持一致：

```ts
new XxxTool(map: Map, config?: PlotConfig)
```

| 方法 | 说明 | 返回值 |
| --- | --- | --- |
| `loadPlotData(data, options?)` | 从结构化数据加载/添加要素；坐标使用经纬度 `[lon, lat]` | `Feature[]` |
| `getFeatures()` | 获取工具图层内的所有要素 | `Feature[]` |
| `getCoordinates()` | 获取当前选中要素的坐标；未选中时通常返回空数组 | `number[][]` |
| `setCoordinates(coordinates)` | 设置当前选中要素的坐标 | `void` |
| `getPointCount()` | 获取当前选中要素的可编辑控制点数量 | `number` |
| `updatePoint(index, coordinate)` | 更新指定索引的控制点坐标 | `void` |
| `clearFeatures()` | 清空所有要素并回到绘制状态 | `this` |
| `getState()` | 获取当前状态：`Idle`、`Drawing` 或 `Editing` | `ToolState` |
| `on(event, handler)` | 注册事件监听 | `this` |
| `off(event, handler)` | 移除事件监听 | `this` |
| `destroy()` | 销毁工具，移除 interaction、图层和事件监听 | `void` |

部分工具提供专属方法：

| 工具 | 专属方法 |
| --- | --- |
| `PointTool` / `ImagePointTool` | `getPosition()` |
| `ImagePointTool` | `updateImageConfig(imageConfig)` |
| `CircleTool` | `getCenter()`、`getRadius()`、`setCenter(center)`、`setRadius(radius)` |
| `AzimuthTool` | `getDistance()`、`getAzimuth()` |
| `RectangleTool` | `getCenter()`、`getWidth()`、`getHeight()` |
| `EllipseTool` | `getCenter()`、`getRadii()` |
| `SectorTool` | `getCenter()`、`getRadius()`、`getAngles()` |
| `ArcTool` | `getStart()`、`getEnd()`、`getPointOnArc()` |
| `StraightArrowTool` / `TaperedArrowTool` / `LineArrowTool` | `getStart()`、`getEnd()`、`getLength()` |
| `FlagTool` | `getPoleLength()`、`getFlagWidth()` |
| `DoubleArrowTool` | `getConnectionPoint()` |

## 事件

使用 `on()` / `off()` 订阅和移除事件，方法均返回 `this`，支持链式调用。

```ts
import { DrawEvent } from '@seedlib/ol-plot'

tool
  .on(DrawEvent.DRAW_START, ({ feature }) => {})
  .on(DrawEvent.DRAW_END, ({ feature }) => {})
  .on(DrawEvent.SELECT, ({ feature }) => {})
  .on(DrawEvent.DESELECT, ({ features }) => {})
  .on(DrawEvent.MODIFY_END, ({ features }) => {})
  .on(DrawEvent.DELETE, ({ feature }) => {})
```

| 事件常量 | 字符串值 | 触发时机 | 回调参数 |
| --- | --- | --- | --- |
| `DrawEvent.DRAW_START` | `drawstart` | 开始绘制 | `{ feature }` |
| `DrawEvent.DRAW_END` | `drawend` | 完成一次绘制 | `{ feature }` |
| `DrawEvent.DRAW_ABORT` | `drawabort` | 绘制被中止 | - |
| `DrawEvent.MODIFY_START` | `modifystart` | 开始拖拽控制点 | - |
| `DrawEvent.MODIFY_END` | `modifyend` | 拖拽控制点结束 | `{ features }` |
| `DrawEvent.SELECT` | `select` | 点击选中要素 | `{ feature }` |
| `DrawEvent.DESELECT` | `deselect` | 取消选中 | `{ features }` |
| `DrawEvent.DELETE` | `delete` | 删除选中要素 | `{ feature }` |

一次典型流程的事件顺序：

```text
点击空白开始绘制 -> DRAW_START
完成绘制         -> DRAW_END -> SELECT
拖拽控制点       -> MODIFY_START -> MODIFY_END
点击空白取消选中 -> DESELECT
```

## 配置

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

interface MeasureConfig {
  mode?: 'total' | 'segment' | 'both'
  unit?: 'm' | 'km' | 'nm'
  labelStyle?: Partial<CSSStyleDeclaration>
}

interface MeasurePlotConfig extends PlotConfig {
  measure?: MeasureConfig
}

interface AreaMeasureConfig {
  unit?: 'm' | 'km' | 'nm'
  labelStyle?: Partial<CSSStyleDeclaration>
}

interface AreaMeasurePlotConfig extends PlotConfig {
  areaMeasure?: AreaMeasureConfig
}

interface FlowLineConfig {
  arrowColor?: string
  arrowSpacing?: number
  speed?: number
}

interface FlowLinePlotConfig extends PlotConfig {
  flowLine?: FlowLineConfig
}

interface ImageLabelConfig {
  text?: string
  fontSize?: number | string
  color?: string
  fontFamily?: string
  fontWeight?: string | number
  offsetX?: number
  offsetY?: number
}

interface ImageConfig {
  src: string
  scale?: number
  anchor?: [number, number]
  opacity?: number
  label?: ImageLabelConfig
}
```

普通标绘工具只接收 `PlotConfig`，不会提示 `measure`、`areaMeasure`、`flowLine`；`MeasureTool` 与 `AzimuthTool` 使用 `measure` 配置，`AreaMeasureTool`、`FlowLineTool` 使用各自的专属配置。

默认配置从 `DEFAULT_CONFIG` 导出：

```ts
import { DEFAULT_CONFIG } from '@seedlib/ol-plot'
```

主要默认值：

| 配置项 | 默认值 |
| --- | --- |
| `strokeColor` | `#2196f3` |
| `strokeWidth` | `2` |
| `fillColor` | `rgba(33, 150, 243, 0.15)` |
| `lineDash` | `[]` |
| `nodeStyle.radius` | `6` |
| `measure.mode` | `total` |
| `measure.unit` | `m` |
| `areaMeasure.unit` | `m` |
| `flowLine.arrowSpacing` | `48` |
| `flowLine.speed` | `60` |

## 图片点示例

```ts
import { ImagePointTool } from '@seedlib/ol-plot'

const imagePoint = new ImagePointTool(map, {
  image: {
    src: '/marker.png',
    scale: 1,
    anchor: [0.5, 1],
    opacity: 1,
    label: {
      text: '北京',
      fontSize: 14,
      color: '#1f2937',
    },
  },
})

imagePoint.updateImageConfig({
  src: '/selected-marker.png',
  scale: 1.2,
  anchor: [0.5, 1],
})
```

## 测量示例

```ts
import { MeasureTool, AreaMeasureTool } from '@seedlib/ol-plot'

const measure = new MeasureTool(map, {
  measure: {
    mode: 'both',
    unit: 'nm',
  },
})

const areaMeasure = new AreaMeasureTool(map, {
  areaMeasure: {
    unit: 'nm',
  },
})
```

## 工具切换

每个工具实例都会创建自己的图层和 interaction。切换工具时建议先销毁当前实例。

```ts
import type { BaseTool } from '@seedlib/ol-plot'
import { LineTool, PolygonTool } from '@seedlib/ol-plot'

let currentTool: BaseTool | null = null

function switchTool(ToolClass: typeof LineTool | typeof PolygonTool) {
  currentTool?.destroy()
  currentTool = new ToolClass(map)
}
```

## 本地开发

```bash
pnpm install
pnpm build
pnpm dev:docs
pnpm clean
```

当前仓库还包含 VitePress 文档站点，更多示例可以查看 `docs/` 目录。

## License

ISC © wlt
