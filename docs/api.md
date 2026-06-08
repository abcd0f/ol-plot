# API 参考


## 工具类

所有工具类均继承自 `BaseTool`，构造签名相同：

```ts
new XxxTool(map: OlMap, config?: PlotConfig)
```

| 参数 | 类型 | 说明 |
|---|---|---|
| `map` | `ol/Map` | OL 地图实例 |
| `config` | `PlotConfig` | 可选，样式配置，未传时使用 `DEFAULT_CONFIG` |

---

### BaseTool

所有工具的抽象基类，提供完整的生命周期、要素管理和事件订阅能力。

#### 生命周期

```ts
tool.activate(): this
```
进入绘制模式。激活 OL Draw 交互，同时禁用选择和编辑交互。

```ts
tool.deactivate(): this
```
退出绘制模式。停止绘制，启用选择和编辑交互，已绘制的要素可被点击选中和拖拽编辑。

```ts
tool.destroy(): void
```
销毁工具。移除所有 OL 交互和图层，清空事件监听。地图卸载时必须调用。

---

#### 要素管理

```ts
tool.addFeature(coordinates: number[][]): Feature
```
以坐标数组创建一个要素并添加到图层。坐标需使用地图投影（如 EPSG:3857），可用 `ol/proj.fromLonLat` 从经纬度转换。返回创建的 `Feature` 对象。

```ts
tool.selectFeature(feature: Feature): this
```
通过程序选中指定要素，使其进入可编辑状态（显示顶点控制手柄）。

```ts
tool.getFeatures(): Feature[]
```
返回图层中所有要素。

```ts
tool.clearFeatures(): this
```
清空图层中所有要素，并取消当前选中状态。

---

#### 事件订阅

```ts
tool.on(event: string, handler: Function): this
tool.off(event: string, handler: Function): this
```

可监听的事件名见 [DrawEvent](#drawevent)。方法返回 `this`，支持链式调用。

**示例：**
```ts
tool
  .on(DrawEvent.DRAW_END, ({ feature }) => { /* 绘制完成 */ })
  .on(DrawEvent.SELECT, ({ feature }) => { /* 选中要素 */ })
  .on(DrawEvent.MODIFY_END, ({ features }) => { /* 编辑完成 */ })
```

---

#### 抽象方法（子类实现）

```ts
tool.setCoordinates(coordinates: number[][]): void
tool.getCoordinates(): number[][]
tool.getPointCount(): number
tool.updatePoint(index: number, coordinate: number[]): void
```

各工具对这些方法的实现见下方各工具章节。

---

### LineTool

折线工具。点击地图添加节点，双击完成绘制。

**绘制方式：** 单击添加节点，双击结束。

```ts
import { LineTool } from 'ol-plot'

const tool = new LineTool(map, {
  strokeColor: '#1890ff',
  strokeWidth: 2,
})
tool.activate()
```

#### setCoordinates

```ts
tool.setCoordinates(coordinates: number[][]): void
```
设置折线的全部顶点坐标。

#### getCoordinates

```ts
tool.getCoordinates(): number[][]
```
返回折线的全部顶点坐标数组，格式为 `[[x1, y1], [x2, y2], ...]`。

#### getPointCount

```ts
tool.getPointCount(): number
```
返回当前折线的顶点数量。

#### updatePoint

```ts
tool.updatePoint(index: number, coordinate: number[]): void
```
更新指定索引处的顶点坐标。`index` 越界时静默忽略。

---

### FreehandLineTool

自由线工具。按住鼠标拖动绘制，松开鼠标完成。适用于手绘路径、标注等场景。

**绘制方式：** 按住鼠标拖动，松开结束。绘制结果为含大量密集节点的 `LineString`。

```ts
import { FreehandLineTool } from 'ol-plot'

const tool = new FreehandLineTool(map)
tool.activate()
```

API 与 [LineTool](#linetool) 完全相同，不再赘述。

---

### PolygonTool

多边形工具。点击地图添加顶点，双击或点击起始点闭合完成。

**绘制方式：** 单击添加顶点，双击（或点击第一个顶点）闭合。

```ts
import { PolygonTool } from 'ol-plot'

const tool = new PolygonTool(map, {
  strokeColor: '#52c41a',
  fillColor: 'rgba(82, 196, 26, 0.15)',
})
tool.activate()
```

#### setCoordinates

```ts
tool.setCoordinates(coordinates: number[][]): void
```
设置多边形外环顶点，**不含**闭合点（首尾无需重复）。

#### getCoordinates

```ts
tool.getCoordinates(): number[][]
```
返回外环顶点数组，**不含**闭合点。

#### getPointCount

```ts
tool.getPointCount(): number
```
返回顶点数量（不含闭合重复点）。

#### updatePoint

```ts
tool.updatePoint(index: number, coordinate: number[]): void
```
更新指定索引处的顶点。若 `index === 0`，同时更新闭合点以保持环的完整性。

---

### RectangleTool

矩形工具。点击拖拽绘制轴对齐矩形，编辑时保持矩形形状约束（拖动任意角点，相邻角自动跟随）。

**绘制方式：** 按住拖拽，松开完成。

```ts
import { RectangleTool } from 'ol-plot'

const tool = new RectangleTool(map)
tool.activate()
```

#### setCoordinates

```ts
tool.setCoordinates(coordinates: number[][]): void
```
通过四个角点设置矩形。传入坐标会自动计算外接包围框，确保结果为轴对齐矩形。`coordinates.length < 4` 时静默忽略。

#### getCoordinates

```ts
tool.getCoordinates(): number[][]
```
返回矩形四个角点 `[BL, TL, TR, BR]`（左下、左上、右上、右下），不含闭合点。

#### getPointCount

```ts
tool.getPointCount(): number
```
固定返回 `4`。

#### updatePoint

```ts
tool.updatePoint(index: number, coordinate: number[]): void
```
更新指定角点坐标，内部会重新计算包围框以保持矩形约束。

---

### CircleTool

圆形工具。点击确定圆心，拖拽确定半径。

**绘制方式：** 按住拖拽，起点为圆心，终点确定半径，松开完成。

```ts
import { CircleTool } from 'ol-plot'

const tool = new CircleTool(map, {
  strokeColor: '#722ed1',
  fillColor: 'rgba(114, 46, 209, 0.1)',
})
tool.activate()
```

#### addCircle

```ts
tool.addCircle(center: number[], radius: number): Feature
```
直接以圆心坐标和半径（地图单位，EPSG:3857 下为米）创建圆形要素并添加到图层。

#### setCoordinates

```ts
tool.setCoordinates(coordinates: number[][]): void
```
`coordinates[0]` 为圆心，`coordinates[1]` 为圆上任意一点，半径由两点距离推算。`coordinates.length < 2` 时静默忽略。

#### getCoordinates

```ts
tool.getCoordinates(): number[][]
```
返回 `[center, [center[0] + radius, center[1]]]` 二元素数组。

#### getPointCount

```ts
tool.getPointCount(): number
```
有激活要素时返回 `2`，否则返回 `0`。

#### updatePoint

```ts
tool.updatePoint(index: number, coordinate: number[]): void
```
`index` 为 `0` 时更新圆心，为 `1` 时更新圆上点（改变半径）。其他值静默忽略。

#### getCenter

```ts
tool.getCenter(): number[] | null
```
返回当前圆的圆心坐标，无激活要素时返回 `null`。

#### getRadius

```ts
tool.getRadius(): number
```
返回当前圆的半径（地图单位），无激活要素时返回 `0`。

#### setRadius

```ts
tool.setRadius(radius: number): void
```
直接设置圆的半径。

#### setCenter

```ts
tool.setCenter(center: number[]): void
```
直接设置圆心坐标，半径不变。

---

## 常量

### DrawType

绘制类型枚举。

```ts
import { DrawType } from 'ol-plot'
```

| 值 | 字符串 | 说明 |
|---|---|---|
| `DrawType.Point` | `'Point'` | 点 |
| `DrawType.Line` | `'LineString'` | 折线 |
| `DrawType.FreehandLine` | `'FreehandLine'` | 自由线 |
| `DrawType.Polygon` | `'Polygon'` | 多边形 |
| `DrawType.Rectangle` | `'Rectangle'` | 矩形 |
| `DrawType.Circle` | `'Circle'` | 圆形 |

---

### DrawEvent

事件名称常量对象，用于 `tool.on()` / `tool.off()` 的第一个参数。

```ts
import { DrawEvent } from 'ol-plot'
```

| 常量 | 字符串值 | 触发时机 | 回调参数 |
|---|---|---|---|
| `DrawEvent.DRAW_START` | `'drawstart'` | 开始绘制（落笔） | `{ feature: Feature }` |
| `DrawEvent.DRAW_END` | `'drawend'` | 完成一次绘制 | `{ feature: Feature }` |
| `DrawEvent.DRAW_ABORT` | `'drawabort'` | 绘制被中止 | — |
| `DrawEvent.MODIFY_START` | `'modifystart'` | 开始拖拽顶点 | — |
| `DrawEvent.MODIFY_END` | `'modifyend'` | 拖拽顶点结束 | `{ features: Feature[] }` |
| `DrawEvent.SELECT` | `'select'` | 点击选中要素 | `{ feature: Feature }` |
| `DrawEvent.DESELECT` | `'deselect'` | 取消选中 | `{ features: Feature[] }` |

---

### DEFAULT\_CONFIG

默认样式配置，类型为 `Required<PlotConfig>`。

```ts
import { DEFAULT_CONFIG } from 'ol-plot'
```

```ts
const DEFAULT_CONFIG = {
  strokeColor: '#2196f3',
  strokeWidth: 2,
  fillColor: 'rgba(33, 150, 243, 0.15)',
  lineDash: [],       // 实线
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

工具样式配置接口，所有字段均为可选。

```ts
interface PlotConfig {
  /** 线条颜色，默认 '#2196f3' */
  strokeColor?: string
  /** 线条宽度（像素），默认 2 */
  strokeWidth?: number
  /** 填充颜色（多边形、矩形、圆形生效），默认 'rgba(33,150,243,0.15)' */
  fillColor?: string
  /** 虚线样式，如 [10, 5] 表示 10px 实线 + 5px 间隔，[] 为实线，默认 [] */
  lineDash?: number[]
  /** 顶点手柄样式 */
  nodeStyle?: NodeStyle
}
```

---

### NodeStyle

顶点控制手柄样式。

```ts
interface NodeStyle {
  /** 圆形手柄半径（像素），默认 6 */
  radius?: number
  /** 手柄填充色，默认 '#ffffff' */
  fill?: string
  /** 手柄描边颜色，默认同 strokeColor */
  stroke?: string
  /** 手柄描边宽度（像素），默认 2 */
  strokeWidth?: number
}
```

---

## 核心类

以下类为内部实现，也可按需单独引入进行二次开发。

### EventBus

内部事件总线，基于 OL 的 `Target` / `BaseEvent` 实现。每个工具实例持有一个独立的 `EventBus`，事件不跨实例传播。

```ts
import { EventBus } from 'ol-plot'
```

```ts
bus.on(event: string, handler: (...args: any[]) => void): void
bus.off(event: string, handler: (...args: any[]) => void): void
bus.emit(event: string, ...args: any[]): void
bus.clear(): void  // 移除所有监听器
```
