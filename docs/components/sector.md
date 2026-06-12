---
title: 扇形
---

# 扇形 Sector

用于在地图上绘制扇形区域。通过三个控制点确定：圆心、起始点（半径方向）和结束点（角度终点方向）。

## 基础用法

绘制时依次确定圆心、半径方向和角度终点，完成扇形绘制。编辑时显示 3 个控制点。

<demo vue="../examples/sector/basic.vue" />

## 绘制行为

- **绘制方式**：依次点击 3 个点（圆心 → 半径方向点 → 角度终点），完成绘制
- **几何类型**：`ol/geom/Polygon`
- **坐标表示**：3 个控制点 — 圆心 + 起始点 + 结束点

## 编辑行为

使用**自定义 Handle 编辑模式**（禁用默认 ModifyManager），仅暴露 3 个控制点供编辑：

- 拖拽圆心 → 平移整个扇形
- 拖曳起始点 → 改变起始角度和半径
- 拖拽结束点 → 改变结束角度
- 拖拽时自动保持半径一致（以变化更大的控制点为准）

## 控制点

| 控制点 | 说明                             |
| ------ | -------------------------------- |
| P0     | 圆心坐标                         |
| P1     | 起始点（用于确定半径和起始角度） |
| P2     | 结束点（用于确定结束角度）       |

编辑状态下仅显示上述三个控制点。

## Attributes

参见 [PlotConfig 类型定义](#类型声明)。

## Events

扇形工具继承 `BaseTool` 的所有事件。详见 [事件系统](../guide/events)。

| 事件名        | 说明             | 回调参数       |
| ------------- | ---------------- | -------------- |
| `drawstart`   | 开始绘制第一个点 | `{ feature }`  |
| `drawend`     | 完成扇形绘制     | `{ feature }`  |
| `select`      | 选中要素         | `{ feature }`  |
| `deselect`    | 取消选中         | `{ features }` |
| `modifystart` | 开始拖拽控制点   | —              |
| `modifyend`   | 拖拽控制点结束   | `{ features }` |
| `delete`      | 删除要素         | `{ feature }`  |

## Methods

### 基础方法

| 方法名                | 说明           | 参数                                                     | 返回值      |
| --------------------- | -------------- | -------------------------------------------------------- | ----------- |
| `addFeature(coords)`  | 程序化添加扇形 | `coords: number[][]` — [center, radiusPoint, anglePoint] | `Feature`   |
| `getFeatures()`       | 获取所有要素   | —                                                        | `Feature[]` |
| `clearFeatures()`     | 清空所有要素   | —                                                        | `this`      |
| `on(event, handler)`  | 注册事件监听   | `event: string`, `handler: Function`                     | `this`      |
| `off(event, handler)` | 移除事件监听   | `event: string`, `handler: Function`                     | `this`      |
| `destroy()`           | 销毁工具实例   | —                                                        | `void`      |

### 坐标方法

| 方法名                      | 说明                     | 参数                               | 返回值                 |
| --------------------------- | ------------------------ | ---------------------------------- | ---------------------- |
| `getCoordinates()`          | 获取三个控制点坐标       | —                                  | `number[][]`           |
| `setCoordinates(coords)`    | 设置控制点并重新计算扇形 | `coords: number[][]`               | `void`                 |
| `getPointCount()`           | 获取控制点数量           | —                                  | `number`（固定返回 3） |
| `updatePoint(index, coord)` | 更新指定控制点（0/1/2）  | `index: number`, `coord: number[]` | `void`                 |

### 便捷方法

| 方法名                                       | 说明                 | 参数                                                                | 返回值                                   |
| -------------------------------------------- | -------------------- | ------------------------------------------------------------------- | ---------------------------------------- |
| `addSector(center, radiusPoint, anglePoint)` | 程序化添加扇形       | `center: number[]`, `radiusPoint: number[]`, `anglePoint: number[]` | `Feature`                                |
| `getCenter()`                                | 获取圆心坐标         | —                                                                   | `number[] \| null`                       |
| `getRadius()`                                | 获取半径             | —                                                                   | `number`                                 |
| `getAngles()`                                | 获取起止角度（弧度） | —                                                                   | `{ start: number; end: number } \| null` |

## 使用示例

### 基础绘制

```ts
import { SectorTool } from 'ol-plot';

const tool = new SectorTool(map, {
  strokeColor: '#52c41a',
  strokeWidth: 2,
  fillColor: 'rgba(82, 196, 26, 0.15)',
  lineDash: [20, 10],
});
```

### 程序化添加扇形

```ts
const tool = new SectorTool(map);

tool.addSector(
  [12958000, 4857000], // 圆心
  [12968000, 4857000], // 半径方向点（确定半径和起始角度）
  [12958000, 4858000], // 角度终点（确定结束角度）
);

// 获取扇形参数
console.log('圆心：', tool.getCenter());
console.log('半径：', tool.getRadius());
console.log('角度：', tool.getAngles());
```

### 监听事件

```ts
import { SectorTool, DrawEvent } from 'ol-plot';

const tool = new SectorTool(map);

tool
  .on(DrawEvent.DRAW_END, ({ feature }) => {
    console.log('扇形绘制完成');
    console.log('三个控制点：', tool.getCoordinates());
  })
  .on(DrawEvent.MODIFY_END, ({ features }) => {
    const angles = tool.getAngles()!;
    console.log(`扇形已更新，角度范围：${angles.start} → ${angles.end}`);
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
