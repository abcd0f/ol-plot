> **取舍原则（Tradeoff）**
>
> 这些规范倾向于**谨慎优先，而非速度优先**。对于非常简单的任务，可根据实际情况灵活判断。

---

## 编码前先思考（Think Before Coding）

**不要凭空假设。不要掩饰困惑。主动说明权衡。**

在开始实现之前：

- 明确说明你的假设。
- 如果存在不确定性，主动提出。
- 如果一个需求有多种理解方式，不要私自选择其中一种，而是把几种可能都列出来。
- 如果存在更简单的实现方案，主动说明。
- 当认为需求本身存在问题时，可以合理提出不同意见（Push back）。
- 如果有任何地方不清楚，就不要继续实现。
  明确指出哪里令人困惑，并向用户提出问题。

---

## 简单优先（Simplicity First）

**只写解决当前问题所需的最少代码，不做任何未被要求的扩展。**

遵循以下原则：

- 不增加任何额外功能。
- 不为一次性代码设计抽象层。
- 不为了所谓的"灵活性"或"可配置性"而增加复杂度，除非明确提出需求。
- 不为理论上不会发生的情况编写错误处理。
- 如果写了 200 行代码，而实际上 50 行就能完成，请重新思考并精简。

始终问自己：

> **一位资深工程师会不会认为这段代码过度设计了？**

如果答案是**会**，那么请继续简化。

---

## 精准修改（Surgical Changes）

**只修改必须修改的内容，只清理自己造成的问题。**

编辑已有代码时：

- 不要顺手优化无关代码。
- 不要修改与当前任务无关的注释。
- 不要调整无关的代码格式。
- 不要重构没有问题的代码。
- 即使你认为已有代码风格不好，也应保持现有风格一致。

如果你发现与当前任务无关的死代码：

- 可以提醒用户存在这些代码。
- **不要主动删除。**

如果你的修改导致某些代码变成无用：

- 删除**因为你的修改**而产生的无用 import。
- 删除**因为你的修改**而产生的无用变量。
- 删除**因为你的修改**而产生的无用函数。

但是：

- **不要顺便删除项目中原本就存在的死代码，除非用户明确要求。**

判断标准：

> **每一处修改，都应该能够直接对应到用户提出的需求。**

---

## 以目标驱动执行（Goal-Driven Execution）

**先定义成功标准，再持续验证直到达成目标。**

将任务转换成**可以验证的目标**。

例如：

> **"增加输入校验"**

应该转换成：

> **先编写非法输入测试，再让测试通过。**

---

> **"修复 Bug"**

应该转换成：

> **先编写能够复现 Bug 的测试，再修复代码，最后确认测试通过。**

---

> **"重构模块 X"**

应该转换成：

> **确保重构前后的测试全部通过。**

---

对于多步骤任务，应先给出一个简洁的执行计划，例如：

```text
1. [执行步骤] → 验证：[检查内容]
2. [执行步骤] → 验证：[检查内容]
3. [执行步骤] → 验证：[检查内容]
```

例如：

```text
1. 修复登录逻辑 → 验证：失败场景能够复现
2. 修改实现 → 验证：登录成功与失败测试均通过
3. 清理因修改产生的无用代码 → 验证：Lint 和测试全部通过
```

**成功标准越具体，模型越能够自主完成整个流程。**

相反，像：

> "把它改好"

这种目标过于模糊，就需要不断向用户确认细节。

---

## 这些规范生效时，你应该看到的效果

如果这些规范真正发挥作用，那么应当出现以下结果：

- 代码 Diff 中出现更少的无关修改。
- 因过度设计而导致返工的情况明显减少。
- 在开始编码之前，会先提出必要的澄清问题，而不是写错之后再修改。

---

## 项目架构（Project Architecture）

本项目是一个基于 OpenLayers 的矢量图形标绘工具库，采用 **monorepo 结构**，使用 **pnpm workspace** 管理。

### 目录结构

```
ol-plot/
├── packages/              # 源代码目录（核心包）
│   ├── constants/        # 常量定义
│   ├── core/             # 核心类和管理器
│   ├── geometry/         # 几何计算函数
│   ├── helper/           # 辅助功能（控制点、测距等）
│   ├── style/            # 样式工厂函数
│   ├── tools/            # 绘图工具实现
│   ├── types/            # TypeScript 类型定义
│   ├── utils/            # 工具函数
│   └── index.ts          # 主入口，导出所有公共 API
├── docs/                  # VitePress 文档站点
├── dist/                  # ESM 构建产物
├── dist-browser/          # IIFE 构建产物（浏览器直接引入）
└── scripts/               # 构建和发布脚本
```

---

### 各目录职责

#### `packages/constants/` — 常量定义

存放项目中所有枚举、常量和默认配置：

- **`drawType.ts`** — 绘制类型枚举（`DrawType.Line`、`DrawType.Circle` 等）
- **`events.ts`** — 事件名称常量（`DrawEvent.DRAW_END` 等）
- **`toolState.ts`** — 工具状态枚举（`Idle`、`Drawing`、`Editing`）
- **`defaultConfig.ts`** — 默认样式配置
- **`mergeConfig.ts`** — 配置合并工具函数

**原则**：

- 所有魔法字符串必须定义为常量
- 枚举类型使用 `enum`，便于类型检查和智能提示

---

#### `packages/core/` — 核心类和管理器

核心架构层，包含基类和各种交互管理器：

- **`BaseTool.ts`** — 所有工具的抽象基类，协调 Draw / Select / Modify 三种交互
- **`HandleBasedTool.ts`** — 自定义控制点工具的抽象基类（继承自 `BaseTool`）
- **`EventBus.ts`** — 事件总线，统一事件分发
- **`FeatureStore.ts`** — 图层与要素存储，控制要素的添加、删除、清空
- **`DrawManager.ts`** — 绘制交互管理
- **`SelectManager.ts`** — 选择交互管理
- **`ModifyManager.ts`** — 编辑交互管理

**职责**：

- `BaseTool` 是所有工具的基础，实现了生命周期自动管理
- 各 Manager 各司其职，单一职责
- 不要在 Manager 中写业务逻辑，只管理对应的 OpenLayers interaction

---

#### `packages/tools/` — 绘图工具实现

所有具体工具的实现类，每个工具一个文件：

- **基础工具**：`PointTool`、`LineTool`、`PolygonTool`、`CircleTool` 等
- **高级工具**：`StraightArrowTool`、`DoubleArrowTool`、`FlagTool`、`MeasureTool` 等

**实现模式**：

1. **简单几何工具**（Point、Line、Polygon、Circle）：
   - 直接继承 `BaseTool`
   - 实现 `createGeometry()`、`getCoordinates()`、`setCoordinates()`、`getPointCount()`、`updatePoint()` 五个抽象方法
   - 使用 OpenLayers 原生几何类型（`Point`、`LineString`、`Polygon`、`Circle`）

2. **自定义几何工具**（Arrow、Flag、Sector、Ellipse 等）：
   - 继承 `HandleBasedTool`
   - 实现 `getPlotType()`（返回工具类型标识）和 `onHandleSync()`（控制点拖拽后重建几何）
   - 在 `packages/geometry/` 中提供对应的几何计算函数
   - 使用 `Polygon` 或 `GeometryCollection` 存储最终几何

---

#### `packages/geometry/` — 几何计算函数

存放复杂图形的几何计算逻辑，纯函数式设计：

- **`arrow/`** — 各种箭头的几何计算（直箭头、渐缩箭头、双箭头等）
- **`arc.ts`** — 弓形几何计算
- **`ellipse.ts`** — 椭圆几何计算
- **`sector.ts`** — 扇形几何计算
- **`rectangle.ts`** — 矩形几何计算
- **`flag.ts`** — 旗标几何计算

**原则**：

- **纯函数**：输入坐标点，返回 `number[][]`（多边形坐标数组）
- 不依赖 OpenLayers 对象，便于测试和复用
- 函数命名规范：`createXxxGeometry(controlPoints: number[][]): number[][]`

---

#### `packages/helper/` — 辅助功能

提供工具类需要的辅助管理功能：

- **`handle.ts`** — `HandleManager` 类，管理自定义控制点的显示和拖拽
- **`measure.ts`** — `MeasureManager` 类，管理测距标签的显示和更新

**职责**：

- 这些 Manager 不是交互管理器，而是特定功能的辅助模块
- `HandleManager` 负责在选中自定义图形时显示可拖拽的控制点
- `MeasureManager` 负责在测距工具中显示距离标签

---

#### `packages/style/` — 样式工厂函数

样式生成逻辑，将配置转换为 OpenLayers Style 对象：

- **`feature.ts`** — `buildFeatureStyle()` 生成要素样式
- **`draw.ts`** — `buildDrawStyle()` 生成绘制过程中的样式
- **`node.ts`** — 生成控制点样式（如果存在）

**原则**：

- 接收 `PlotConfig` 配置对象
- 返回 OpenLayers `Style` 或 `Style[]`
- 不要在工具类中直接创建样式，统一使用工厂函数

---

#### `packages/types/` — TypeScript 类型定义

所有公共接口和类型定义：

- **`config.ts`** — `PlotConfig`、`NodeStyle`、`MeasureConfig` 等配置类型
- 其他业务类型

**原则**：

- 所有公共 API 必须有完整的 TypeScript 类型
- 使用 `interface` 定义配置对象
- 使用 `type` 定义联合类型或复杂类型

---

#### `packages/utils/` — 工具函数

通用的纯函数工具：

- 数学计算（距离、角度、向量等）
- 坐标转换
- 数组操作

**原则**：

- 纯函数，无副作用
- 单一职责，函数名清晰
- 不依赖项目特定逻辑，可以独立测试

---

## 创建新工具的规范（Tool Creation Guidelines）

### 新增工具的唯一入口：PlotDefinition

几何算法继续放在 `packages/geometry/` 的纯函数中；绘制参数、成型、更新、控制点提取和规范化统一定义在 `packages/plot-defs/index.ts` 的 `PLOT_DEFS` 中。新增一种图形时：

1. 在 `packages/constants/drawType.ts` 增加 `DrawType`。
2. 在 `packages/plot-defs/index.ts` 增加对应的 `PlotDefinition`，注册 `olType`、`geometryFunction`、点数限制和几何生命周期方法。
3. 只有存在领域行为时才在 `packages/tools/` 增加薄工具类；通用几何读写由 `BaseTool` / `HandleBasedTool` 提供。
4. 在 `packages/index.ts` 导出工具（如需公开）。
5. 更新 README.md、API 文档与回归测试。

不要再修改 `DrawManager` 或 `PlotManager` 来添加图形分支；它们只消费注册表。自由手绘是唯一保留在 `DrawManager` 的交互特例。

---

### 代码规范示例

#### 简单几何工具示例（LineTool）

```ts
import Map from 'ol/Map';
import LineString from 'ol/geom/LineString';
import type Geometry from 'ol/geom/Geometry';
import type { PlotConfig } from '../types/config';
import { DrawType } from '../constants/drawType';
import { BaseTool } from '../core/BaseTool';

export class LineTool extends BaseTool {
  constructor(map: Map, config?: PlotConfig) {
    super(map, DrawType.Line, config);
  }

  protected createGeometry(coordinates: number[][]): Geometry {
    return new LineString(coordinates);
  }

  setCoordinates(coordinates: number[][]): void {
    if (!this.activeFeature) return;
    (this.activeFeature.getGeometry() as LineString).setCoordinates(coordinates);
  }

  getCoordinates(): number[][] {
    if (!this.activeFeature) return [];
    return (this.activeFeature.getGeometry() as LineString).getCoordinates();
  }

  getPointCount(): number {
    return this.getCoordinates().length;
  }

  updatePoint(index: number, coordinate: number[]): void {
    const coords = this.getCoordinates();
    if (index < 0 || index >= coords.length) return;
    coords[index] = coordinate;
    this.setCoordinates(coords);
  }
}
```

---

#### 自定义几何工具示例（FlagTool）

**1. 几何计算函数（`packages/geometry/flag.ts`）**：

```ts
export function createFlagGeometry(controlPoints: number[][]): number[][] {
  if (controlPoints.length < 2) return [];
  const [start, end] = controlPoints;
  // ... 计算旗标的多边形坐标
  return polygonCoords;
}
```

**2. 工具类（`packages/tools/FlagTool.ts`）**：

```ts
import Map from 'ol/Map';
import Polygon from 'ol/geom/Polygon';
import type Geometry from 'ol/geom/Geometry';
import type { PlotConfig } from '../types/config';
import { DrawType } from '../constants/drawType';
import { HandleBasedTool } from '../core/HandleBasedTool';
import { createFlagGeometry } from '../geometry/flag';

export class FlagTool extends HandleBasedTool {
  constructor(map: Map, config?: PlotConfig) {
    super(map, DrawType.Flag, config);
  }

  protected getPlotType(): string {
    return 'flag';
  }

  protected onHandleSync(controlPoints: number[][]): void {
    if (!this.activeFeature) return;
    this.activeFeature.set('controlPoints', controlPoints);
    const coords = createFlagGeometry(controlPoints);
    (this.activeFeature.getGeometry() as Polygon).setCoordinates([coords]);
  }

  protected createGeometry(coordinates: number[][]): Geometry {
    const coords = createFlagGeometry(coordinates);
    return new Polygon([coords]);
  }

  // 实现 BaseTool 的抽象方法
  setCoordinates(coordinates: number[][]): void {
    if (!this.activeFeature) return;
    this.activeFeature.set('controlPoints', coordinates);
    const coords = createFlagGeometry(coordinates);
    (this.activeFeature.getGeometry() as Polygon).setCoordinates([coords]);
  }

  getCoordinates(): number[][] {
    if (!this.activeFeature) return [];
    return this.activeFeature.get('controlPoints') || [];
  }

  getPointCount(): number {
    return this.getCoordinates().length;
  }

  updatePoint(index: number, coordinate: number[]): void {
    const coords = this.getCoordinates();
    if (index < 0 || index >= coords.length) return;
    coords[index] = coordinate;
    this.setCoordinates(coords);
  }
}
```

---

### 关键注意事项

1. **不要在工具类中直接操作地图**：
   - 所有地图操作通过 Manager 完成
   - 工具类只负责几何逻辑和数据管理

2. **几何计算函数必须是纯函数**：
   - 输入坐标数组，返回坐标数组
   - 不依赖外部状态，不产生副作用
   - 便于测试和调试

3. **控制点 vs 几何顶点**：
   - **控制点**（`controlPoints`）：用户绘制和拖拽的点，存储在 `feature.get('controlPoints')`
   - **几何顶点**：渲染出来的多边形顶点，由控制点计算得出
   - 自定义几何工具中，两者通常不同（如箭头：2 个控制点 → 几十个几何顶点）

4. **事件处理统一通过 EventBus**：
   - 不要直接在工具类中监听 OpenLayers 事件
   - 在 Manager 中触发，在工具类中订阅

5. **样式配置集中管理**：
   - 不要在工具类中硬编码样式
   - 使用 `packages/style/` 中的工厂函数

---

## 总结

遵循以上架构和规范，可以确保：

- **职责清晰**：每个模块有明确的职责边界
- **易于扩展**：新增工具只需关注几何逻辑，复用基础设施
- **易于维护**：代码结构一致，修改影响范围可控
- **类型安全**：完整的 TypeScript 支持，减少运行时错误
