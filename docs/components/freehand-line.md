---
title: 自由线
---

# 自由线 FreehandLine

用于在地图上绘制自由线。第一次点击确定起点，移动鼠标时持续采样轨迹，第二次点击确定终点，适用于手绘路径和区域标注。

## 基础用法

第一次点击地图确定起点，移动鼠标时线条跟随光标并持续记录轨迹点，第二次点击地图确定终点并自动进入编辑态。

<demo vue="../examples/free-line/basic.vue" />

## 绘制行为

- **绘制方式**：点击起点，移动预览终点，再次点击终点结束
- **几何类型**：`ol/geom/LineString`
- **节点密度**：绘制结果包含鼠标移动过程中的大量采样节点

## 编辑行为

选中状态下通过 OL 默认 Modify interaction 编辑，所有采样顶点均可拖拽。

## 控制点

| 控制点  | 说明                                 |
| ------- | ------------------------------------ |
| P0 ~ Pn | 鼠标移动过程中的全部采样顶点 |

## Attributes

参见 [PlotConfig 类型定义](#类型声明)。

## Events

自由线工具继承 `BaseTool` 的所有事件。详见 [事件系统](../guide/events)。

| 事件名        | 说明             | 回调参数       |
| ------------- | ---------------- | -------------- |
| `drawstart`   | 按下鼠标开始绘制 | `{ feature }`  |
| `drawend`     | 第二次点击确定终点 | `{ feature }`  |
| `select`      | 选中要素         | `{ feature }`  |
| `deselect`    | 取消选中         | `{ features }` |
| `modifystart` | 开始拖拽顶点     | —              |
| `modifyend`   | 拖拽顶点结束     | `{ features }` |
| `delete`      | 删除要素         | `{ feature }`  |

## Methods

自由线工具的 API 与 [折线 Line](./line) 完全相同。
事件回调中的 `data` 坐标会自动转换为经纬度。

| 方法名                      | 说明             | 参数                               | 返回值       |
| --------------------------- | ---------------- | ---------------------------------- | ------------ |
| `loadPlotData(data, options?)` | 从结构化数据加载/添加自由线；坐标使用经纬度 `[lon, lat]` | `PlotFeatureData \| PlotFeatureData[]`, `PlotRestoreOptions` | `Feature[]` |
| `getCoordinates()`          | 获取全部顶点坐标 | —                                  | `number[][]` |
| `setCoordinates(coords)`    | 设置全部顶点坐标 | `coords: number[][]`               | `void`       |
| `getPointCount()`           | 获取顶点数量     | —                                  | `number`     |
| `updatePoint(index, coord)` | 更新指定顶点     | `index: number`, `coord: number[]` | `void`       |
| `getFeatures()`             | 获取所有要素     | —                                  | `Feature[]`  |
| `clearFeatures()`           | 清空所有要素     | —                                  | `this`       |
| `destroy()`                 | 销毁工具实例     | —                                  | `void`       |

## 使用示例

### 基础绘制

```ts
import { FreehandLineTool } from 'ol-plot';

const tool = new FreehandLineTool(map, {
  strokeColor: '#1890ff',
  strokeWidth: 2,
});
```

### 自定义样式

```ts
import { FreehandLineTool } from 'ol-plot';

const tool = new FreehandLineTool(map, {
  strokeColor: '#ff4d4f',
  strokeWidth: 3,
  lineDash: [5, 5],
  nodeStyle: {
    radius: 4,
    fill: '#fff',
    stroke: '#ff4d4f',
    strokeWidth: 1,
  },
});
```

### 监听绘制完成

```ts
import { FreehandLineTool, DrawEvent } from 'ol-plot';

const tool = new FreehandLineTool(map);

tool.on(DrawEvent.DRAW_END, ({ feature }) => {
  const coords = tool.getCoordinates();
  console.log(`绘制完成，共 ${coords.length} 个采样点`);
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
