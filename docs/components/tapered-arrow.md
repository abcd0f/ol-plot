---
title: 斜箭头
---

# 斜箭头 TaperedArrow

用于在地图上绘制渐缩箭头（箭身宽度从尾部到头部逐渐增大）。由两个控制点确定：箭尾中心点和箭头尖端点。

## 基础用法

按住鼠标从箭尾拖拽到箭头尖端，松开鼠标完成绘制。编辑时显示 2 个控制点。

<demo vue="../examples/tapered-arrow/arrow-basic.vue" />

## 绘制行为

- **绘制方式**：按住拖拽，起点为箭尾中心点，终点为箭头尖端点，松开鼠标完成
- **几何类型**：`ol/geom/Polygon`（由多个顶点组成的渐缩箭头形状 Polygon）
- **坐标表示**：2 个控制点 — 箭尾中心点 + 箭头尖端点

## 编辑行为

使用**自定义 Handle 编辑模式**（禁用默认 ModifyManager）。箭头 Polygon 由多个顶点组成，不适合直接编辑，因此只暴露 2 个控制点：

- 选中要素时显示 2 个控制点
- 拖拽控制点时重新计算整个箭头 Polygon
- 取消选中时隐藏控制点

## 箭头结构

与 `StraightArrow` 的区别在于箭身形状：

- **StraightArrow**：箭身宽度恒定（矩形），仅箭头部分变宽
- **TaperedArrow**：箭身宽度从尾部到头部逐渐增大，尾部最窄，箭头部分最宽

```
    P0 ═════════════════════════════▶ P1
  箭尾（窄）  ──→ 逐渐变宽 ──→  箭头尖端（最宽）
```

左右两侧完全对称。

## 控制点

| 控制点 | 说明       |
| ------ | ---------- |
| P0     | 箭尾中心点 |
| P1     | 箭头尖端点 |

编辑状态下仅显示上述两个控制点。箭头形状由 `buildTaperedArrow()` 函数根据这两个控制点自动计算。

## Attributes

参见 [PlotConfig 类型定义](#类型声明)。

## Events

斜箭头工具继承 `BaseTool` 的所有事件。详见 [事件系统](../guide/events)。

| 事件名        | 说明             | 回调参数       |
| ------------- | ---------------- | -------------- |
| `drawstart`   | 按下鼠标开始拖拽 | `{ feature }`  |
| `drawend`     | 松开鼠标完成箭头 | `{ feature }`  |
| `select`      | 选中要素         | `{ feature }`  |
| `deselect`    | 取消选中         | `{ features }` |
| `modifystart` | 开始拖拽控制点   | —              |
| `modifyend`   | 拖拽控制点结束   | `{ features }` |
| `delete`      | 删除要素         | `{ feature }`  |

## Methods

| 方法名                      | 说明                     | 参数                                | 返回值                 |
| --------------------------- | ------------------------ | ----------------------------------- | ---------------------- |
| `addFeature(coords)`        | 程序化添加箭头           | `coords: number[][]` — [tail, head] | `Feature`              |
| `getCoordinates()`          | 获取两个控制点坐标       | —                                   | `number[][]`           |
| `setCoordinates(coords)`    | 设置控制点并重新计算箭头 | `coords: number[][]`                | `void`                 |
| `getPointCount()`           | 获取控制点数量           | —                                   | `number`（固定返回 2） |
| `updatePoint(index, coord)` | 更新指定控制点（0 或 1） | `index: number`, `coord: number[]`  | `void`                 |
| `addArrow(start, end)`      | 程序化添加斜箭头         | `start: number[]`, `end: number[]`  | `Feature`              |
| `getStart()`                | 获取箭尾中心点           | —                                   | `number[] \| null`     |
| `getEnd()`                  | 获取箭头尖端点           | —                                   | `number[] \| null`     |
| `getLength()`               | 获取箭头长度             | —                                   | `number`               |
| `getFeatures()`             | 获取所有要素             | —                                   | `Feature[]`            |
| `clearFeatures()`           | 清空所有要素             | —                                   | `this`                 |
| `destroy()`                 | 销毁工具实例             | —                                   | `void`                 |

## 使用示例

### 基础绘制

```ts
import { TaperedArrowTool } from 'ol-plot';

const tool = new TaperedArrowTool(map, {
  strokeColor: '#fa8c16',
  strokeWidth: 2,
  fillColor: 'rgba(250, 140, 22, 0.2)',
});
```

### 程序化添加箭头

```ts
const tool = new TaperedArrowTool(map);

tool.addArrow(
  [12958000, 4857000], // 箭尾
  [12975000, 4856000], // 箭头尖端
);

console.log('长度：', tool.getLength());
```

### 与直箭头对比

```ts
// 直箭头 — 矩形箭身
const straightTool = new StraightArrowTool(map, {
  strokeColor: '#1890ff',
  fillColor: 'rgba(24, 144, 255, 0.2)',
});
straightTool.addArrow([12950000, 4856000], [12960000, 4857000]);

// 斜箭头 — 渐缩箭身
const taperedTool = new TaperedArrowTool(map, {
  strokeColor: '#fa8c16',
  fillColor: 'rgba(250, 140, 22, 0.2)',
});
taperedTool.addArrow([12950000, 4854000], [12960000, 4855000]);
```

## 类型声明

```ts
interface PlotConfig {
  strokeColor?: string;
  strokeWidth?: number;
  fillColor?: string;
  lineDash?: number[];
  nodeStyle?: NodeStyle;
}

interface NodeStyle {
  radius?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}
```
