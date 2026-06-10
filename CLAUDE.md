# ol-plot/packages — AI 辅助阅读文档

## 一、项目概述

`ol-plot` 是一个基于 **OpenLayers** 的地图绘图工具库，提供点、线、自由线、多边形、矩形、圆、椭圆等几何图形的**绘制（Draw）→ 选择（Select）→ 编辑（Modify）**全生命周期管理。

核心设计理念：**协调式交互（Coordinated Interactions）**——Draw、Select、Modify 三个 OL interaction 同时挂载在 map 上并常驻，通过 `condition` 回调和添加顺序（优先级）保证同一次点击只被一个 interaction 处理，避免冲突。

---

## 二、目录结构总览

```
packages/
├── index.ts                 # 统一导出入口
├── types/
│   ├── index.ts             # 类型导出桥接
│   └── config.ts            # PlotConfig / NodeStyle 接口定义
├── constants/
│   ├── index.ts             # 常量导出桥接
│   ├── drawType.ts          # DrawType 枚举（Point/Line/Polygon/...）
│   ├── toolState.ts         # ToolState 枚举（Idle/Drawing/Editing）
│   ├── defaultConfig.ts     # 默认绘图样式配置
│   └── events.ts            # DrawEvent 事件名常量
├── core/
│   ├── EventBus.ts          # 内部事件总线（基于 OL Target）
│   ├── BaseTool.ts          # 抽象基类：整合 Layer/Draw/Select/Modify
│   ├── LayerManager.ts      # 矢量图层 & 数据源管理
│   ├── DrawManager.ts       # 绘制交互管理（含起笔条件协调）
│   ├── SelectManager.ts     # 选择交互管理
│   └── ModifyManager.ts     # 编辑/修改交互管理
├── tools/
│   ├── PointTool.ts         # 点绘制工具
│   ├── LineTool.ts          # 线段绘制工具
│   ├── FreehandLineTool.ts  # 自由手绘线工具
│   ├── PolygonTool.ts       # 多边形绘制工具
│   ├── RectangleTool.ts     # 矩形绘制工具（含约束保持矩形形状）
│   ├── CircleTool.ts        # 圆形绘制工具
│   └── EllipseTool.ts       # 椭圆绘制工具（自定义控制点 handle）
└── utils/
    ├── index.ts             # 样式工厂函数集合
    └── ellipse.ts           # 椭圆几何计算辅助函数
```

---

## 三、核心架构

### 3.1 状态机

每个工具实例自动维护一个三态状态机：

```
┌──────────────────────────────────────────────────┐
│                                                  │
│   ┌──────┐  构造/取消选中  ┌─────────┐           │
│   │ Idle │ ───────────────▶│ Drawing │           │
│   └──────┘                 └────┬────┘           │
│       ▲                         │ drawend        │
│  destroy()                      ▼                │
│       │                    ┌─────────┐           │
│       └────────────────────│ Editing │           │
│                            └────┬────┘           │
│                                 │ deselect       │
│                                 ▼                │
│                            回到 Drawing          │
└──────────────────────────────────────────────────┘
```

- **Idle**：工具未初始化或已销毁
- **Drawing**：绘制态，点击空白区域开始绘制新图形
- **Editing**：编辑态，已选中某要素，可拖拽顶点修改

### 3.2 交互协调机制

三个 interaction 的添加顺序为 `Select → Modify → Draw`，由于 OL 中后添加的 interaction 优先级更高，**Draw 拥有最高优先级**。

Draw 的 `condition` 回调逻辑：
1. 正在绘制中（`sketching = true`）→ 允许继续落点
2. 当前有选中要素（`!canStartDraw()`）→ 本次点击让给 Select 处理取消选中
3. 点击位置落在已有要素上 → 让给 Select 处理选中
4. 其余情况（空白处且无选中）→ 允许起笔绘制

### 3.3 事件系统

`EventBus` 封装了 OL 的 `Target` 事件系统，提供 `on/off/emit/clear` 接口。所有内部通信通过事件驱动：

| 事件名 | 触发时机 | 携带数据 |
|--------|---------|---------|
| `drawstart` | 开始绘制（落笔） | `{ feature }` |
| `drawend` | 完成一次绘制 | `{ feature }` |
| `drawabort` | 绘制被中止 | 无 |
| `modifystart` | 开始拖拽顶点 | 无 |
| `modifyend` | 拖拽顶点结束 | `{ features }` |
| `select` | 点击选中要素 | `{ feature }` |
| `deselect` | 取消选中 | `{ features }` |
| `delete` | 删除选中要素 | `{ feature }` |

---

## 四、核心类详解

### 4.1 `BaseTool`（抽象基类）

**文件**：`core/BaseTool.ts`

**职责**：
- 统一管理 LayerManager、DrawManager、SelectManager、ModifyManager 的生命周期
- 自动维护状态机流转
- 提供通用 API（`addFeature`, `getFeatures`, `clearFeatures`, `on`, `off`, `destroy`）
- 键盘快捷键支持（Delete/Backspace 删除选中要素）

**抽象方法**（子类必须实现）：
| 方法 | 说明 |
|------|------|
| `createGeometry(coordinates)` | 从坐标数组构建对应类型的 OL Geometry |
| `setCoordinates(coordinates)` | 设置活动要素的坐标 |
| `getCoordinates()` | 获取活动要素的坐标 |
| `getPointCount()` | 获取控制点数量 |
| `updatePoint(index, coordinate)` | 更新指定索引的控制点 |

**使用示例**：
```ts
import { LineTool } from 'ol-plot';
import Map from 'ol/Map';

const map = new Map({ /* ... */ });
const tool = new LineTool(map, {
  strokeColor: '#ff0000',
  strokeWidth: 3,
});

// 监听事件
tool.on('drawend', ({ feature }) => {
  console.log('绘制完成', feature);
});

// 销毁
tool.destroy();
```

### 4.2 `LayerManager`（图层管理器）

**文件**：`core/LayerManager.ts`

**职责**：管理一个 `VectorLayer + VectorSource` 组合，提供要素的增删查清操作。

**API**：
| 方法 | 说明 |
|------|------|
| `getSource()` | 获取矢量数据源 |
| `getLayer()` | 获取矢量图层 |
| `getFeatures()` | 获取所有要素 |
| `addFeature(feature)` | 添加要素 |
| `removeFeature(feature)` | 移除要素 |
| `clear()` | 清空所有要素 |
| `destroy()` | 销毁（从 map 移除图层） |

### 4.3 `DrawManager`（绘制管理器）

**文件**：`core/DrawManager.ts`

**职责**：
- 创建 OL `Draw` interaction 并常驻
- 根据 `DrawType` 配置对应的 OL 绘制模式（Point/LineString/Polygon/Circle + geometryFunction）
- 实现 `condition` 协调逻辑
- 通过 EventBus 发布 `drawstart/drawend/drawabort` 事件

**特殊处理**：
- `Rectangle` → 使用 OL 的 `createBox()` geometryFunction
- `Ellipse` → 使用自定义 `createEllipseGeometryFunction()`
- `FreehandLine` → 启用 `freehand: true` 模式

### 4.4 `SelectManager`（选择管理器）

**文件**：`core/SelectManager.ts`

**职责**：
- 管理 OL `Select` interaction
- 支持单选（`multi: false`）
- 提供程序化选中/取消选中接口
- 发布 `select/deselect` 事件

### 4.5 `ModifyManager`（修改管理器）

**文件**：`core/ModifyManager.ts`

**职责**：
- 管理 OL `Modify` interaction
- 绑定到 SelectManager 的选中要素集合
- 发布 `modifystart/modifyend` 事件

---

## 五、绘制工具详解

### 5.1 `PointTool`（点工具）

**文件**：`tools/PointTool.ts`

- 绘制类型：`DrawType.Point`
- 几何类型：`ol/geom/Point`
- 特殊处理：覆盖图层样式为 CircleStyle（点需要 image 样式才能渲染）
- 额外 API：`getPosition()` 获取点坐标

### 5.2 `LineTool`（线段工具）

**文件**：`tools/LineTool.ts`

- 绘制类型：`DrawType.Line`
- 几何类型：`ol/geom/LineString`
- 交互方式：逐点点击绘制，双击结束

### 5.3 `FreehandLineTool`（自由手绘线工具）

**文件**：`tools/FreehandLineTool.ts`

- 绘制类型：`DrawType.FreehandLine`
- 几何类型：`ol/geom/LineString`
- 交互方式：按住鼠标自由绘制，松开结束（`freehand: true`）

### 5.4 `PolygonTool`（多边形工具）

**文件**：`tools/PolygonTool.ts`

- 绘制类型：`DrawType.Polygon`
- 几何类型：`ol/geom/Polygon`
- 特殊处理：`getPointCount()` 排除闭合点；`updatePoint()` 第一个点修改时同步更新闭合点

### 5.5 `RectangleTool`（矩形工具）

**文件**：`tools/RectangleTool.ts`

- 绘制类型：`DrawType.Rectangle`
- 几何类型：`ol/geom/Polygon`（四顶点 + 闭合点）
- **核心特性：矩形约束**
  - 绘制完成后自动 `attachConstraint()`
  - 监听 geometry 的 `change` 事件，当用户拖拽一个顶点时，自动更新相邻顶点以保持矩形形状
  - 使用 `SHARE_X / SHARE_Y` 查找表确定哪些顶点共享 X/Y 坐标
  - 取消选中时 `detachConstraint()` 移除监听

### 5.6 `CircleTool`（圆形工具）

**文件**：`tools/CircleTool.ts`

- 绘制类型：`DrawType.Circle`
- 几何类型：`ol/geom/Circle`
- 坐标表示：`[center, radiusPoint]` 两个控制点
- 额外 API：`getCenter()`, `getRadius()`, `setCenter()`, `setRadius()`, `addCircle(center, radius)`

### 5.7 `EllipseTool`（椭圆工具）

**文件**：`tools/EllipseTool.ts`

- 绘制类型：`DrawType.Ellipse`
- 几何类型：`ol/geom/Polygon`（64段近似椭圆）
- **核心特性：自定义控制点 Handle**
  - 禁用默认 ModifyManager（椭圆顶点过多无法直接编辑）
  - 创建独立的 handle 图层和 Modify interaction
  - 两个控制点代表外接矩形对角顶点
  - 拖拽控制点时 `syncFromHandles()` 重新计算椭圆几何
- 额外 API：`getCenter()`, `getRadii()`, `addEllipse(p1, p2)`

---

## 六、工具函数（utils）

### 6.1 `utils/index.ts`

| 函数 | 说明 |
|------|------|
| `mergeConfig(config?)` | 合并用户配置与默认配置 |
| `buildFeatureStyle(config)` | 构建要素渲染样式（stroke + fill） |
| `buildDrawStyle(config)` | 构建绘制草图样式（隐藏跟随鼠标的 Point） |
| `buildSelectStyle(config)` | 构建选中样式（几何 + 顶点圆点叠加） |
| `buildModifyStyle(config)` | 构建编辑拖拽手柄样式 |

### 6.2 `utils/ellipse.ts`

| 函数 | 说明 |
|------|------|
| `buildEllipse(controlPoints)` | 根据两个对角控制点生成 64 段椭圆 Polygon 坐标 |
| `getEllipseControlPoints(polygon)` | 从椭圆 Polygon 的 extent 反推控制点 |
| `getEllipseCenter(controlPoints)` | 计算椭圆中心点 |
| `createEllipseGeometryFunction()` | OL Draw 交互的 geometryFunction（实时预览椭圆） |

---

## 七、配置项

```ts
interface PlotConfig {
  strokeColor?: string;      // 线颜色，默认 '#2196f3'
  strokeWidth?: number;      // 线宽度，默认 2
  fillColor?: string;        // 填充色，默认 'rgba(33, 150, 243, 0.15)'
  lineDash?: number[];       // 虚线配置，默认 []（实线）
  nodeStyle?: NodeStyle;     // 节点（顶点）样式
}

interface NodeStyle {
  radius?: number;           // 节点半径，默认 6
  fill?: string;             // 节点填充色，默认 '#ffffff'
  stroke?: string;           // 节点描边色，默认 '#2196f3'
  strokeWidth?: number;      // 节点描边宽度，默认 2
}
```

---

## 八、快速使用指南

### 基本使用

```ts
import Map from 'ol/Map';
import { LineTool, PolygonTool, CircleTool, DrawEvent } from 'ol-plot';

const map = new Map({ /* 你的地图配置 */ });

// 创建工具即自动进入绘制态
const lineTool = new LineTool(map);

// 监听绘制完成
lineTool.on(DrawEvent.DRAW_END, ({ feature }) => {
  console.log('线段绘制完成', lineTool.getCoordinates());
});

// 监听编辑
lineTool.on(DrawEvent.MODIFY_END, ({ features }) => {
  console.log('编辑结束', lineTool.getCoordinates());
});

// 监听删除
lineTool.on(DrawEvent.DELETE, ({ feature }) => {
  console.log('要素已删除');
});

// 切换工具时先销毁旧工具
lineTool.destroy();
const polygonTool = new PolygonTool(map);
```

### 自定义样式

```ts
const tool = new RectangleTool(map, {
  strokeColor: '#e91e63',
  strokeWidth: 3,
  fillColor: 'rgba(233, 30, 99, 0.1)',
  lineDash: [10, 5],
  nodeStyle: {
    radius: 8,
    fill: '#fff',
    stroke: '#e91e63',
    strokeWidth: 2,
  },
});
```

### 程序化添加要素

```ts
// 添加一条线
const lineTool = new LineTool(map);
lineTool.addFeature([[0, 0], [100, 100], [200, 50]]);

// 添加一个圆
const circleTool = new CircleTool(map);
circleTool.addCircle([116.4, 39.9], 5000);

// 添加一个椭圆
const ellipseTool = new EllipseTool(map);
ellipseTool.addEllipse([116.3, 39.8], [116.5, 40.0]);
```

### 获取和操作数据

```ts
const tool = new PolygonTool(map);

// 获取所有已绘制的要素
const features = tool.getFeatures();

// 获取当前选中要素的坐标
const coords = tool.getCoordinates();

// 修改某个顶点
tool.updatePoint(2, [120, 40]);

// 清空所有要素
tool.clearFeatures();
```

---

## 九、设计模式与关键决策

1. **常驻 Interaction**：三个 interaction 创建后不再增删，通过 condition 控制行为，避免频繁创建销毁带来的性能和状态问题。

2. **事件驱动状态机**：状态流转完全由 EventBus 事件触发，BaseTool 统一处理，子类无需关心状态管理。

3. **矩形约束守护**：RectangleTool 通过 geometry change 监听器实现"拖拽任意顶点时保持矩形"的用户体验。

4. **椭圆特殊处理**：由于椭圆是 64 段 Polygon 近似，不能直接用 Modify 编辑所有顶点，因此 EllipseTool 创建了独立的 handle 图层，只暴露两个控制点。

5. **样式分离**：草图样式隐藏 Point 类型几何（跟随鼠标的预览点），保证绘制阶段视觉干净。

---

## 十、依赖关系图

```
BaseTool (abstract)
  ├── LayerManager      → VectorLayer + VectorSource
  ├── DrawManager       → Draw interaction
  ├── SelectManager     → Select interaction
  ├── ModifyManager     → Modify interaction
  └── EventBus          → 内部事件通信

具体工具 (extends BaseTool)
  ├── PointTool
  ├── LineTool
  ├── FreehandLineTool
  ├── PolygonTool
  ├── RectangleTool     (+矩形约束)
  ├── CircleTool
  └── EllipseTool       (+自定义 handle 图层)
```

---

## 十一、扩展新工具

要添加一个新的绘制工具类型：

1. 在 `constants/drawType.ts` 中添加新的枚举值
2. 创建 `tools/XxxTool.ts`，继承 `BaseTool`
3. 实现 4 个抽象方法：`createGeometry`, `setCoordinates`, `getCoordinates`, `getPointCount`, `updatePoint`
4. 如果需要特殊的 OL 绘制行为，在 `DrawManager` 中添加对应的条件分支
5. 在 `packages/index.ts` 中导出新工具

```ts
// 示例：添加一个星形工具
export class StarTool extends BaseTool {
  constructor(map: Map, config?: PlotConfig) {
    super(map, DrawType.Star, config); // 需先在 DrawType 中添加 Star
  }

  protected createGeometry(coordinates: number[][]): Geometry {
    // 从坐标生成星形 Polygon
    return new Polygon([computeStarRing(coordinates)]);
  }

  // ... 实现其他抽象方法
}
```
