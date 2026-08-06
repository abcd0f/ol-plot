---
title: 旗帜
---

# 旗帜 Flag

用于在地图上绘制旗帜标绘图形。通过两个控制点确定旗杆长度和旗面宽度，内部自动生成旗杆和旗面几何。

## 基础用法

按住鼠标拖拽确定旗帜控制范围，松开鼠标完成绘制。编辑时仅显示 2 个控制点。

<demo vue="../examples/flag/basic.vue" />

## 绘制行为

- **绘制方式**：按住拖拽，起点为旗杆顶部，终点确定旗杆长度和旗面宽度
- **几何类型**：`ol/geom/GeometryCollection`（旗杆 LineString + 旗面 Polygon）
- **坐标表示**：2 个控制点代表旗杆顶部和旗杆底部横向偏移点

## 编辑行为

使用**自定义 Handle 编辑模式**（禁用默认 ModifyManager）。旗帜由复合几何组成，因此只暴露 2 个控制点供拖拽：

- 选中要素时显示 2 个控制点
- 拖拽任意控制点时重新计算旗杆和旗面几何
- 取消选中时隐藏控制点

## 控制点

| 控制点 | 说明                       |
| ------ | -------------------------- |
| P0     | 旗杆顶部（旗面附着点） |
| P1     | 旗杆底部横向偏移点     |

## Attributes

参见 [PlotConfig 类型定义](#类型声明)。

## Events

旗帜工具继承 `BaseTool` 的所有事件。详见 [事件系统](../guide/events)。

| 事件名        | 说明             | 回调参数       |
| ------------- | ---------------- | -------------- |
| `drawstart`   | 按下鼠标开始拖拽 | `{ feature }`  |
| `drawend`     | 松开鼠标完成旗帜 | `{ feature }`  |
| `select`      | 选中要素         | `{ feature }`  |
| `deselect`    | 取消选中         | `{ features }` |
| `modifystart` | 开始拖拽控制点   | —              |
| `modifyend`   | 拖拽控制点结束   | `{ features }` |
| `delete`      | 删除要素         | `{ feature }`  |

## Methods

### 基础方法

| 方法名                | 说明           | 参数                                 | 返回值      |
| --------------------- | -------------- | ------------------------------------ | ----------- |
| `loadPlotData(data, options?)` | 从结构化数据加载/添加旗帜；坐标使用经纬度 `[lon, lat]` | `PlotFeatureData \| PlotFeatureData[]`, `PlotRestoreOptions` | `Feature[]` |
| `getFeatures()`       | 获取所有要素   | —                                    | `Feature[]` |
| `clearFeatures()`     | 清空所有要素   | —                                    | `this`      |
| `on(event, handler)`  | 注册事件监听   | `event: string`, `handler: Function` | `this`      |
| `off(event, handler)` | 移除事件监听   | `event: string`, `handler: Function` | `this`      |
| `destroy()`           | 销毁工具实例   | —                                    | `void`      |

### 坐标方法

| 方法名                      | 说明                         | 参数                                        | 返回值                 |
| --------------------------- | ---------------------------- | ------------------------------------------- | ---------------------- |
| `getCoordinates()`          | 获取两个控制点               | —                                           | `number[][]`           |
| `setCoordinates(coords)`    | 设置控制点并重新计算旗帜     | `coords: number[][]`                        | `void`                 |
| `getPointCount()`           | 获取控制点数量               | —                                           | `number`（固定返回 2） |
| `updatePoint(index, coord)` | 更新指定控制点               | `index: number` (0 或 1), `coord: number[]` | `void`                 |

### 便捷方法

| 方法名            | 说明         | 参数 | 返回值   |
| ----------------- | ------------ | ---- | -------- |
| `getPoleLength()` | 获取旗杆长度 | —    | `number` |
| `getFlagWidth()`  | 获取旗面宽度 | —    | `number` |

## 使用示例

### 基础绘制

```ts
import { FlagTool } from 'ol-plot';

const tool = new FlagTool(map, {
  strokeColor: '#722ed1',
  strokeWidth: 2,
  fillColor: 'rgba(114, 46, 209, 0.1)',
});
```

### 程序化添加旗帜

```ts
const tool = new FlagTool(map);

tool.loadPlotData({
  type: 'Flag',
  coordinates: [
    [116.3974, 39.9293], // 旗杆顶部
    [116.4174, 39.9093], // 旗杆底部横向偏移点
  ],
  style: {
    strokeColor: '#722ed1',
    strokeWidth: 2,
    fillColor: 'rgba(114, 46, 209, 0.1)',
    lineDash: [],
    nodeStyle: { radius: 6, fill: '#fff', stroke: '#722ed1', strokeWidth: 2 },
  },
  properties: {},
});

console.log('旗杆长度：', tool.getPoleLength());
console.log('旗面宽度：', tool.getFlagWidth());
```

### 监听编辑

```ts
import { FlagTool, DrawEvent } from 'ol-plot';

const tool = new FlagTool(map);

tool.on(DrawEvent.MODIFY_END, ({ features }) => {
  console.log('旗帜已更新');
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
