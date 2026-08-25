# ol-plot `packages/` 架构改造指南

> 本文是**给开发者 / AI 编码助手执行的改造说明**，只针对 `packages/` 源码（不含 `docs/`）。
> 每个改造项都包含：**定位（文件:行）→ 现状问题 → 目标设计 → 执行步骤 → 验证方式 → 工作量**。
> 原则：**保持对外行为不变，只统一内部实现**。除非某项明确标注为「行为变更」。

---

## 一、总体评估

项目当前正处于一次**未完成的重构中途**：

- **旧架构（单体）**：`packages/core/PlotManager.ts`（1118 行），用一个实例 + `switch(drawType)` 管理全部 22 种图形。
- **新架构（分解）**：每种图形一个 `XxxTool`（`packages/tools/*.ts`）→ 继承 `BaseTool` / `HandleBasedTool` → 组合 `PlotRuntime` → 由 `PlotRuntime` 统一协调 `EventBus / LayerManager / SelectManager / ModifyManager / CursorManager / InteractionCoordinator / EditorController`。

两套 API **同时对外导出**（见 `packages/index.ts:1-12`），并且**各自独立实现了同一套几何/样式/生命周期分发逻辑**。这是整个 `packages/` 最核心的结构性问题：**同一个图形的几何知识散落在 4 个地方**（纯函数 `geometry/`、`DrawManager` 绘制分发、`PlotManager` 的 4 个 switch、以及各 `Tool` 类），任何一处改动都要同步改其余几处，极易漏改、难以测试、难以扩展。

### 值得保留、不要动的优点

1. **`geometry/` 纯函数设计**（`buildSector` / `buildStraightArrow` / `buildFlagGeometries` …）：无副作用、可测试，是全项目最健康的一层，改造时应作为**唯一的几何计算源**继续复用。
2. **`PlotRuntime` + `InteractionCoordinator` + `EditorController` 的分层方向是对的**：把「交互互斥协调」「编辑模式状态机」从工具里剥离出来是正确抽象，应作为统一运行时保留并强化。
3. **`CursorManager` 用 `requestAnimationFrame` 节流命中检测**（`packages/core/CursorManager.ts:99-108`）：性能处理得当。
4. 各 OL 交互 Manager（`SelectManager` / `ModifyManager` / `DrawManager`）**职责单一**，是良好的封装边界。

---

## 二、改造项清单（按优先级）

### 🔴 P0 — 消除双实现，建立单一事实源

#### CS1 —— 建立「图形定义注册表」(PlotDefinition Registry) 作为唯一几何来源

**维度**：架构 / 扩展性 / 可读性 / 性能
**工作量**：large（是后续所有改造的地基）

**定位（当前几何逻辑重复的 4 个位置）**
- 纯函数：`packages/geometry/*.ts`（✅ 正确来源）
- 绘制期分发：`packages/core/DrawManager.ts:79-146`（`if/else if` 链：drawType → OL 绘制类型 + `geometryFunction` + min/maxPoints）
- 单体分发：`packages/core/PlotManager.ts` 内 **4 个 switch/分支**
  - `createGeometry` → `packages/core/PlotManager.ts:465-527`
  - `updateFeatureGeometry` → `packages/core/PlotManager.ts:529-656`
  - `extractControlPoints` → `packages/core/PlotManager.ts:709-752`
  - `normalizeControlPoints` → `packages/core/PlotManager.ts:754-770`
- 每工具分发：如 `packages/tools/StraightArrowTool.ts:32-75`、`packages/tools/FlagTool.ts:41-104`（每个 Tool 的 `createGeometry / setCoordinates / onHandleSync / createFeature` 都在重复调用同一 `build*` 函数）

**现状问题**
新增或修改一种图形，需要在上述 **≥4 个文件、7~10 处** 手工同步。例如「直箭头」的知识同时存在于 `geometry/arrow/straight.ts`、`DrawManager`、`PlotManager`（4 处 case）、`StraightArrowTool`（4 个方法）。这是重复代码的根源，也是扩展性差、易漏改的根本原因。

**目标设计**
为每个 `DrawType` 定义一个**图形定义对象**，集中描述该图形的全部策略；`DrawManager`、`PlotManager`、`Tool`、序列化恢复**全部改为消费同一注册表**。建议放在新目录 `packages/plot-defs/`（或 `packages/registry/`）：

```ts
// 说明性示意，非最终代码
export interface PlotDefinition {
  drawType: DrawType;
  plotType: string;                       // 取代散落各处的 'straightArrow' 字面量
  editMode: 'feature' | 'handles';        // 取代 PlotManager 的 HANDLE_PLOT_TYPES 集合
  // —— 绘制期（供 DrawManager）——
  olType: 'Point' | 'LineString' | 'Polygon' | 'Circle';
  geometryFunction?: () => GeometryFunction;
  minPoints?: number; maxPoints?: number;
  // —— 成型 / 编辑期（供 Tool 与 PlotManager 共用）——
  build(controlPoints: number[][], ctx: PlotContext): Geometry;
  update(geom: Geometry, controlPoints: number[][], ctx: PlotContext): void;
  extractControlPoints(geom: Geometry): number[][];
  normalizeControlPoints?(points: number[][], hint?: number): number[][];
  // —— 样式 ——（可选，覆盖默认样式工厂）
  buildFeatureStyle?(config: ResolvedPlotConfig): StyleLike;
}

export const PLOT_DEFS: Record<DrawType, PlotDefinition> = { /* … */ };
```

**执行步骤**
1. 新建 `packages/plot-defs/types.ts` 定义 `PlotDefinition` 与 `PlotContext`（`PlotContext` 至少含 `config`、`projection`，供 RangeRings 等需要投影的图形使用）。
2. 为每个 `DrawType` 建一个定义文件（如 `packages/plot-defs/straightArrow.ts`），把 `PlotManager` 4 个 switch 中对应的 case 逻辑与 `DrawManager` 对应分支逻辑，**原样搬进**该定义对象的方法里（仅搬运，不改算法）。
3. 在 `packages/plot-defs/index.ts` 汇总成 `PLOT_DEFS` 注册表并导出。
4. 先不改调用方，仅新增注册表；确保编译通过。

**验证**
- `pnpm build` / `vue-tsc` 编译通过。
- 为 3~4 个代表性图形（point / sector / straightArrow / rangeRings）写单测：`build → extractControlPoints → normalize` 往返一致（可与改造前 `PlotManager` 私有方法产出逐点对比）。

---

#### CS2 —— 让 `DrawManager` 与 `PlotManager` 消费注册表，删除内部 switch

**维度**：架构 / 可读性 / 扩展性
**工作量**：large（依赖 CS1）
**行为要求**：不变

**定位**
- `packages/core/DrawManager.ts:79-146`（if/else 链）
- `packages/core/PlotManager.ts:465-527 / 529-656 / 709-752 / 754-770`（4 个 switch）

**现状问题**
分发逻辑与消费逻辑耦合在一起，`PlotManager` 因此膨胀到 1118 行且极难阅读。

**目标设计**
- `DrawManager` 构造函数从 `PLOT_DEFS[drawType]` 读取 `olType / geometryFunction / min/maxPoints`，删除整条 if/else 链。
- `PlotManager` 的 `createGeometry / updateFeatureGeometry / extractControlPoints / normalizeControlPoints` 全部改为一行委托：`PLOT_DEFS[drawType].build(...)` 等，删除 4 个 switch。`HANDLE_PLOT_TYPES`（`packages/core/PlotManager.ts:65-77`）与 `PLOT_TYPE_BY_DRAW_TYPE`（`packages/core/PlotManager.ts:1058-1081`）改为从注册表派生。

**执行步骤**
1. 改 `DrawManager`：用 `const def = PLOT_DEFS[drawType]` 取代 if/else；`ClickFreehandDraw` 分支保留（属自由线特例，可在定义里加 `freehandType` 字段承载）。
2. 改 `PlotManager` 四个方法为委托调用。
3. 删除 `PlotManager` 中已无引用的 `build*` import（`packages/core/PlotManager.ts:40-61`）与私有辅助（`closeRing` 等若已移入定义）。
4. `HANDLE_PLOT_TYPES` / `PLOT_TYPE_BY_DRAW_TYPE` 改为 `Object.values(PLOT_DEFS)` 派生。

**验证**
- 手动回归：逐一激活每种工具，绘制 → 选中 → 拖拽控制点 → 序列化 `getPlotData()` → `restorePlotData()` 还原，图形与改造前一致。
- `PlotManager.ts` 行数应从 ~1118 降到 ~400 以下。

---

#### CS3 —— 让 `Tool` 类变薄：几何逻辑改为委托注册表

**维度**：架构 / 可读性 / 扩展性
**工作量**：medium（依赖 CS1）
**行为要求**：不变

**定位（每工具重复实现）**
- `packages/tools/StraightArrowTool.ts:32-75`
- `packages/tools/FlagTool.ts:41-104`
- `packages/tools/SectorTool.ts:43-101`
- 其余 22 个工具中所有直接调用 `build*` 的方法

**现状问题**
每个 Tool 的 `createGeometry / setCoordinates / getCoordinates / getPointCount / updatePoint / onHandleSync` 基本都是「调用某个 `build*` + 存 `controlPoints`」的模板代码，在 22 个文件里重复。且与 `PlotManager` 的同名逻辑重复。

**目标设计**
在 `BaseTool` / `HandleBasedTool` 中提供**基于注册表的默认实现**：基类持有 `this.def = PLOT_DEFS[drawType]`，`createGeometry / setCoordinates / getCoordinates / getPointCount / updatePoint / onHandleSync` 全部下沉到基类，默认走 `this.def.*`。具体 Tool 仅保留**该图形独有的语义 API**（如 `StraightArrowTool.getLength()`、`SectorTool.getAngles()`）。

**执行步骤**
1. `BaseTool` 增加 `protected def: PlotDefinition`（构造时 `PLOT_DEFS[drawType]`）。
2. 把五个抽象方法改为基类默认实现（委托 `def`），`createGeometry` 不再是 `abstract`。
3. 逐个精简 Tool：删除与默认实现等价的方法，仅保留领域 getter 与真正的特例。
4. `HandleBasedTool` 的 `getPlotType()` 改为返回 `this.def.plotType`，去掉子类里对 `getPlotType()` 的重复实现（如 `StraightArrowTool.ts:28-30`）。

**验证**
- 每个 Tool 文件行数显著下降（预期简单工具 <30 行）。
- 编译通过 + 逐工具手动回归绘制/编辑。

> ⚠️ 决策点（Phase 0 先定）：CS2/CS3 完成后，`PlotManager` 与 `Tool` 都只是注册表之上的**薄壳**。二者服务不同用法（`PlotManager`＝单实例多类型、共享一个图层；`Tool`＝单类型）。**建议两者都保留**，但明确定位为薄 facade。若产品只需其一，则删除另一个以进一步减负——**此决策必须先做**，它决定后续工作量。

---

### 🟠 P1 — 消除跨文件复制粘贴、修正脆弱依赖

#### CS4 —— 抽出统一「动画引擎」，消除 FlowLine/AlarmPoint 动画重复

**维度**：可读性 / 架构 / 性能
**工作量**：medium

**定位**
- `packages/tools/FlowLineTool.ts:63-115`（`startAnimation / stopAnimation / hasAnimatedFlowLines / ensureAnimation / updateAnimationState / getFlowPhase`）
- `packages/core/PlotManager.ts:913-1009`（**几乎逐字相同**，只是多合并了 AlarmPoint 分支）

**现状问题**
一整套 `requestAnimationFrame` 动画循环在两个文件里重复；`FlowLineTool` 与 `AlarmPointTool` 之间也各自维护。逻辑一旦改（如节流策略），要改多处。

**目标设计**
新建 `packages/helper/animator.ts`，导出一个 `PlotAnimator`：入参为「是否仍需动画」判定与「每帧回调」，内部统一管理 rAF 句柄、`lastFrameTime`、`delta` 上限（`Math.min(delta,100)`）。`FlowLineTool`、`AlarmPointTool`、`PlotManager` 共用它。

**执行步骤**
1. 提取 `PlotAnimator`（`start(shouldContinue, onFrame)` / `stop()`）。
2. `FlowLineTool` 用 `PlotAnimator` 替换自有循环，保留 `getFlowPhase` 相位计算。
3. `PlotManager` 同样替换，保留 AlarmPoint 帧率节流（`getAlarmFrameInterval`）作为 `onFrame` 内的判断。

**验证**：流动线动画、告警点脉冲动画视觉与改造前一致；删除要素后动画自动停止（`updateAnimationState` 逻辑保留）。

---

#### CS5 —— 提取「扇形拖拽解析」共用逻辑

**维度**：可读性 / 架构
**工作量**：small

**定位**
- `packages/tools/SectorTool.ts:115-135`（`resolveDraggedControlPoints` + `moved()`）
- `packages/core/PlotManager.ts:772-787`（`resolveSectorDraggedControlPoints`）+ `packages/core/PlotManager.ts:1106-1108`（`moved()`）

**现状问题**：整段拖拽位移解析与 `moved()` 工具函数在两处**逐字复制**。

**目标设计**：移入 `packages/geometry/sector.ts`（纯函数 `resolveSectorDrag(prev, next, draggingIndex)`），两处调用同一函数。`moved()` 移入 `packages/utils/math.ts`。

**验证**：扇形拖拽中心/半径/角度控制点行为不变。

---

#### CS6 —— 统一事件包装逻辑，消除 `BaseTool`/`PlotManager` 复制

**维度**：可读性 / 架构
**工作量**：small

**定位**
- `packages/core/BaseTool.ts:254-274`（`on/off`）+ `packages/core/BaseTool.ts:331-349`（`withStructuredData`）
- `packages/core/PlotManager.ts:367-380` + `packages/core/PlotManager.ts:1037-1055`（**逐字相同**）

**现状问题**：两个类各维护一份「`eventWrappers` 双层 Map + `withStructuredData` 注入结构化数据」的逻辑；且这层包装叠加在 `EventBus` 自身的 `wrappers`（`packages/core/EventBus.ts:25-56`）之上，形成**双层包装**，可读性差。

**目标设计**：把「对外事件订阅 + 结构化数据注入」提取为一个 mixin 或独立类 `StructuredEventEmitter`，由 `BaseTool` 与 `PlotManager` 共用。理想情况下让 `PlotRuntime.eventBus` 直接承担这层，去掉外层 `eventWrappers`。

**验证**：`on(event, handler)` 回调仍收到带 `data` / `dataList` 的参数；`off` 能正确解绑。

---

#### CS7 —— `SelectManager.setStyle` 停止依赖 OpenLayers 私有 API

**维度**：性能稳定性 / 可维护性（**风险项**）
**工作量**：medium

**定位**：`packages/core/SelectManager.ts:110-130`

**现状问题**：代码强转访问 OL `Select` 的**私有成员** `style_` / `applySelectedStyle_` / `restorePreviousStyle_`。这些是内部实现，OL 升级或压缩混淆时随时可能失效——属隐藏的高风险耦合。

**目标设计**：优先改为受支持的方案：
- 方案 A：不通过 `Select` 的样式覆盖来表达「选中态」，而是让**要素样式函数**根据 `selectedFeatures` 集合自行返回选中样式（`SelectManager` 已持有该 collection）。
- 方案 B：动态切换 `select` 时重建 `Select` 实例并复用现有 `features` collection。

**执行步骤**
1. 评估现有「选中样式切换」的调用点（`BaseTool.refreshActiveFeatureStyle` / `PlotManager.setStyleConfig`）。
2. 改为「图层样式函数读取选中集合」的渲染方式，删除对私有成员的访问。

**验证**：选中/取消选中的视觉高亮不变；升级 OL 小版本后仍工作。

---

#### CS8 —— 明确多实例开销：多工具应共享一个运行时

**维度**：性能 / 架构（**可能行为变更，需决策**）
**工作量**：medium~large

**定位**：`packages/core/PlotRuntime.ts:80-121`、`packages/core/BaseTool.ts:83-102`

**现状问题**：每个 `Tool` 实例都会 `new PlotRuntime`，进而**各建一套** `VectorLayer`（`FeatureStore`）、`Select`、`Modify`、`CursorManager`（含一个 `pointermove` 监听 + 一个提示 DOM）、以及一个 `document.keydown` 全局监听（`packages/core/PlotRuntime.ts:120`）。若业务同时实例化多个工具：
- N 个图层 / N 个 Select / N 个 Modify 交互叠加，点击命中与选中冲突；
- N 个 `document` keydown 监听，删除键可能被多实例重复响应；
- N 个提示 DOM 与 N 个 pointermove 命中检测，帧开销叠加。

**目标设计**：**一个地图共享一个 `PlotRuntime`**。两种可选形态：
- 若采用 `PlotManager` 作为主 facade：它本就单实例多类型，直接推荐「多工具场景用 `PlotManager`，单工具场景才用 `Tool`」，并在 README 写明。
- 若坚持多 `Tool` 并存：让 `PlotRuntime` 可被多个 Tool 共享注入（构造函数接收现有 runtime），共用图层与交互。

**验证**：同一地图上使用多种工具时，只有一个 select/modify/keydown/提示 DOM；切换工具无冲突。

---

### 🟡 P2 — 可读性与一致性清理

#### CS9 —— 删除 `LayerManager` 空别名（二选一）
**维度**：可读性 / 架构 · **工作量**：small
**定位**：`packages/core/LayerManager.ts:1-10`（整个类只是 `extends FeatureStore` 的空壳，注释自承「Backward-compatible name」）。且 `packages/index.ts:3-4` 同时导出 `LayerManager` 与 `FeatureStore`——**同一个类两个名字**。
**目标**：确定唯一名称（建议保留 `FeatureStore`，它更贴切），全项目替换 `LayerManager` 引用（`PlotRuntime` / `BaseTool` / `PlotManager` 内的字段与构造），删除别名文件与其中一个导出。
**验证**：编译通过；`grep -r LayerManager packages` 无残留（或反之）。

#### CS10 —— `CursorManager` 提示文案与样式外置
**维度**：可读性 / 扩展性 · **工作量**：small
**定位**：`packages/core/CursorManager.ts:36-52`（硬编码中文 `'点击进入编辑'` + 一大段内联 style）。
**问题**：文案无法配置 / 无法国际化；样式硬编码在逻辑里。
**目标**：把提示文案与样式提到 `PlotConfig`（如 `config.hint = { text, className }`）或至少提到 `constants/defaultConfig.ts`，允许业务覆盖或关闭。
**验证**：可通过配置修改/隐藏提示，默认行为不变。

#### CS11 —— 收敛 feature 上的魔法字符串
**维度**：可读性 / 可维护性 · **工作量**：small~medium
**定位（散落的字符串 key）**：`'controlPoints'`、`'plotType'`、`'_controlPoints'`、`'_drawType'`（仅 `PlotManager.ts:64` 定义了常量 `DRAW_TYPE_PROPERTY`）、`'rangeRingsSpacing'`、`'rangeRingsUnit'`、`'_handleIndex'`。遍布 `PlotManager` / `HandleBasedTool` / 各 Tool / `helper/handle.ts`（`grep -rn "'controlPoints'\|'plotType'" packages` 可见数十处）。
**问题**：拼写错误无编译期保护；无法一眼看清一个 feature 上挂了哪些运行时属性。
**目标**：在 `packages/constants/` 集中定义 `FEATURE_KEYS`，并提供**类型化访问器**（`getControlPoints(feature)` / `setControlPoints(feature, pts)` 等），全项目替换字面量。
**验证**：编译通过；无裸字符串 key 残留。

#### CS12 —— 配置类型三层收敛 + `image` 特殊处理
**维度**：可读性 · **工作量**：small
**定位**：`packages/types/config.ts:83-124`（`PlotConfig` / `InternalPlotConfig` / `ResolvedPlotConfig = Required<InternalPlotConfig>`）；`packages/constants/mergeConfig.ts:4-42`（`mergeConfig` 未显式合并 `image`，与 `Required<...>` 要求 `image` 存在之间存在隐含约定）。
**问题**：三层配置类型的边界与「哪些字段一定被 resolve」不直观；`image` 的默认与合并被特殊处理（散落在 `PlotManager`）。
**目标**：给三层类型加清晰注释说明各自用途；`mergeConfig` 显式处理所有 optional 分支（含 `image`），使「Resolved 即全部字段有值」成为编译期可信的事实。
**验证**：`vue-tsc` 无隐式 any / 无 `Required` 与实际缺省不一致的报错。

#### CS13 —— 修正文档与实现不符（`CLAUDE.md`）
**维度**：可读性 / 扩展性 · **工作量**：small
**定位**：仓库根 `CLAUDE.md`「创建新工具的规范」一节，只描述了改 `drawType` / `geometry` / `tools` / `DrawManager` / `index`，**完全没提** `PlotManager` 那 4 个 switch + `HANDLE_PLOT_TYPES` + `PLOT_TYPE_BY_DRAW_TYPE` 也必须同步修改。
**问题**：照文档新增工具，会漏改 `PlotManager`，导致该图形在 `PlotManager` 路径下不可用。
**目标**：完成 CS1~CS3 后，新增工具**只需新增一个 `PlotDefinition` 文件**；届时更新 `CLAUDE.md` 使「唯一步骤 = 加一个定义 + 注册」，让文档与新架构一致。

#### 杂项（minor，随手清理，勿扩大范围）
- `getDrawTypeByPlotType`（`packages/core/PlotManager.ts:1020-1026`）每次调用做 `Object.entries().find()` 反查，建议预建反向 Map。
- `PlotManager` 同时把控制点存在 `feature.set('controlPoints')` **和** `geom.set('_controlPoints')` 两处（如 `packages/core/PlotManager.ts:460-462`），CS11 后应明确单一存储位置。
- `HandleManager.handleModify.on('modifyend')` 空回调占位（`packages/helper/handle.ts:47-49`）可删。

---

## 三、分阶段执行路线图

| 阶段 | 目标 | 包含改造项 | 前置 |
|---|---|---|---|
| **Phase 0：决策** | 确定目标形态：`PlotManager` 与 `Tool` 是否都保留（见 CS3 决策点、CS8）。**先补测试**：为现有各图形「绘制→编辑→序列化→还原」建立回归用例，作为改造安全网。 | — | — |
| **Phase 1：地基** | 建立图形定义注册表 | **CS1** | Phase 0 |
| **Phase 2：去重主干** | 让 `DrawManager` / `PlotManager` / `Tool` 全部消费注册表，删除 4 个 switch 与 if/else 链、精简 Tool | **CS2 → CS3** | CS1 |
| **Phase 3：消除复制粘贴** | 动画引擎、扇形拖拽、事件包装、魔法字符串 | **CS4, CS5, CS6, CS11** | 可与 P2 并行 |
| **Phase 4：稳健性 & 收尾** | 私有 API 依赖、多实例开销、别名/提示/配置/文档清理 | **CS7, CS8, CS9, CS10, CS12, CS13** | — |

**关键顺序约束**：CS1 是一切的前提；CS2 依赖 CS1；CS3 依赖 CS1。P1/P2 中的 CS4~CS13 相互独立，可并行或按人手安排。

**贯穿始终的验证基线**：每完成一个改造项都要跑「Phase 0 建立的回归用例 + `vue-tsc` 类型检查 + 逐工具手动绘制/编辑/序列化」。**改造以「行为不变」为硬约束**，行数下降与重复消除为成功信号（预期 `PlotManager.ts` 从 1118 行降至 ~400 行内，`core/` 与 `tools/` 总重复几何分发从 4 处收敛为 1 处）。
