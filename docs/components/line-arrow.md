---
title: 线箭头
---

# 线箭头 LineArrow

用于在地图上绘制线型箭头（线条箭身 + 实心三角形箭头）。由两个控制点确定：箭尾点和箭头尖端点。

## 基础用法

按住鼠标从箭尾拖拽到箭头尖端，松开鼠标完成绘制。编辑时显示 2 个控制点。

<demo vue="../examples/line-arrow/line-arrow-basic.vue" />

## 绘制行为

- **绘制方式**：按住拖拽，起点为箭尾点，终点为箭头尖端点，松开鼠标完成
- **几何类型**：`ol/geom/GeometryCollection`，包含：
  - `LineString` — 箭身线段（仅描边，无填充）
  - `Polygon` — 实心箭头头部（三角形，填充 + 描边）
- **坐标表示**：2 个控制点 — 箭尾点 + 箭头尖端点

## 编辑行为

使用**自定义 Handle 编辑模式**（禁用默认 ModifyManager）。`GeometryCollection` 不能直接用 OL Modify 编辑，因此只暴露 2 个控制点：

- 选中要素时显示 2 个控制点
- 拖拽控制点时重新生成箭身 LineString + 箭头 Polygon
- 取消选中时隐藏控制点

## 与其他箭头对比

| 特性     | LineArrow          | StraightArrow            | TaperedArrow             |
| -------- | ------------------ | ------------------------ | ------------------------ |
| 箭身     | 线条（LineString） | 矩形 Polygon             | 渐缩 Polygon             |
| 箭头     | 实心三角形 Polygon | 三角形（Polygon 一部分） | 三角形（Polygon 一部分） |
| 几何类型 | GeometryCollection | Polygon                  | Polygon                  |
| 箭身填充 | 无（仅描边）       | 有（fill）               | 有（fill）               |

## 控制点

| 控制点 | 说明           |
| ------ | -------------- |
| P0     | 箭尾点坐标     |
| P1     | 箭头尖端点坐标 |

编辑状态下仅显示上述两个控制点。

## Attributes

参见 [PlotConfig 类型定义](#类型声明)。

## Events

线箭头工具继承 `BaseTool` 的所有事件。详见 [事件系统](../guide/events)。

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

| 方法名                      | 说明                          | 参数                                | 返回值                 |
| --------------------------- | ----------------------------- | ----------------------------------- | ---------------------- |
| `addFeature(coords)`        | 程序化添加箭头                | `coords: number[][]` — [tail, head] | `Feature`              |
| `getCoordinates()`          | 获取两个控制点坐标            | —                                   | `number[][]`           |
| `setCoordinates(coords)`    | 设置控制点并重新生成箭头      | `coords: number[][]`                | `void`                 |
| `getPointCount()`           | 获取控制点数量                | —                                   | `number`（固定返回 2） |
| `updatePoint(index, coord)` | 更新指定控制点（0 或 1）      | `index: number`, `coord: number[]`  | `void`                 |
| `addArrow(start, end)`      | 程序化添加线箭头              | `start: number[]`, `end: number[]`  | `Feature`              |
| `getStart()`                | 获取箭尾点                    | —                                   | `number[] \| null`     |
| `getEnd()`                  | 获取箭头尖端点                | —                                   | `number[] \| null`     |
| `getLength()`               | 获取箭头长度（P0 到 P1 距离） | —                                   | `number`               |
| `getFeatures()`             | 获取所有要素                  | —                                   | `Feature[]`            |
| `clearFeatures()`           | 清空所有要素                  | —                                   | `this`                 |
| `destroy()`                 | 销毁工具实例                  | —                                   | `void`                 |

## 使用示例

### 基础绘制

```ts
import { LineArrowTool } from 'ol-plot';

const tool = new LineArrowTool(map, {
  strokeColor: '#eb2f96',
  strokeWidth: 3,
  fillColor: 'rgba(235, 47, 150, 0.3)',
});
```

### 程序化添加箭头

```ts
const tool = new LineArrowTool(map);

tool.addArrow(
  [12958000, 4857000], // 箭尾
  [12975000, 4856000], // 箭头尖端
);

// 获取箭头信息
console.log('箭尾：', tool.getStart());
console.log('箭头：', tool.getEnd());
console.log('长度：', tool.getLength());
```

### 监听事件

```ts
import { LineArrowTool, DrawEvent } from 'ol-plot';

const tool = new LineArrowTool(map);

tool
  .on(DrawEvent.DRAW_END, ({ feature }) => {
    console.log('线箭头绘制完成，长度：', tool.getLength());
  })
  .on(DrawEvent.MODIFY_END, ({ features }) => {
    console.log('线箭头已更新');
  });
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
