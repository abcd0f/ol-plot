---
title: 线
---

# 折线（Line）

用于在地图上绘制折线、路径线、轨迹线等线状要素。

支持：

- 普通折线
- 虚线折线
- 点状折线
- 两点直线段
- 自定义颜色
- 自定义线宽
- 自定义线型
- 自定义交互参数
- 绘制事件监听

# 快速开始

```ts
import { LineTool } from '@seedlib/ol-plot';

const lineTool = new LineTool(map);

lineTool.activate();
```

激活后：

- 单击添加节点
- 双击结束绘制

# 基础折线

用于展示默认配置下的 LineTool。

<demo vue="../examples/line/line-basic.vue" />

# 虚线折线

演示样式配置。

<demo vue="../examples/line/line-dashed.vue" />

# 点线

演示不同线型配置。

<demo vue="../examples/line/line-dotted.vue" />

# 两点直线段

演示交互配置。

<demo vue="../examples/line/line-two-point.vue" />

# 配置项

所有绘制工具均支持统一配置体系。

```ts
new LineTool(map, {
  stroke: {},
  sketchStroke: {},
  fill: {},
  vertex: {},
  layer: {},
  interaction: {},
  tooltip: {},
});
```

## Stroke（线样式）

| 参数           | 类型     | 说明       |
| -------------- | -------- | ---------- |
| color          | string   | 线颜色     |
| width          | number   | 线宽       |
| lineDash       | number[] | 虚线样式   |
| lineCap        | LineCap  | 端点样式   |
| lineJoin       | LineJoin | 连接样式   |
| lineDashOffset | number   | 虚线偏移量 |

## SketchStroke（预览样式）

控制绘制过程中的临时线样式。

## Fill（填充样式）

适用于 Polygon、Rectangle、Circle 等面状图形。

| 参数  | 类型   | 说明     |
| ----- | ------ | -------- |
| color | string | 填充颜色 |

## Vertex（控制点样式）

| 参数        | 类型   | 说明     |
| ----------- | ------ | -------- |
| radius      | number | 半径     |
| fillColor   | string | 填充颜色 |
| strokeColor | string | 描边颜色 |
| strokeWidth | number | 描边宽度 |

## Layer（图层配置）

| 参数    | 类型    | 说明       |
| ------- | ------- | ---------- |
| zIndex  | number  | 图层层级   |
| opacity | number  | 图层透明度 |
| visible | boolean | 是否显示   |

## Interaction（交互配置）

| 参数            | 类型    | 说明         |
| --------------- | ------- | ------------ |
| snapEnabled     | boolean | 启用吸附     |
| freehand        | boolean | 自由绘制     |
| maxPoints       | number  | 最大节点数   |
| minPoints       | number  | 最小节点数   |
| clickTolerance  | number  | 点击容差     |
| stopDoubleClick | boolean | 双击结束绘制 |

## Tooltip（提示信息）

| 参数        | 类型             | 说明     |
| ----------- | ---------------- | -------- |
| enabled     | boolean          | 是否启用 |
| startText   | string           | 开始提示 |
| drawingText | string           | 绘制提示 |
| offset      | [number, number] | 偏移量   |

# 事件

## DRAW_START

```ts
lineTool.on(DrawEvent.DRAW_START, handler);
```

## DRAW_END

```ts
lineTool.on(DrawEvent.DRAW_END, handler);
```

## DRAW_ABORT

```ts
lineTool.on(DrawEvent.DRAW_ABORT, handler);
```

## MODIFY_START

```ts
lineTool.on(DrawEvent.MODIFY_START, handler);
```

## MODIFY_END

```ts
lineTool.on(DrawEvent.MODIFY_END, handler);
```

# 方法

## activate

```ts
lineTool.activate();
```

## deactivate

```ts
lineTool.deactivate();
```

## clear

```ts
lineTool.clear();
```

## destroy

```ts
lineTool.destroy();
```

## updateConfig

```ts
lineTool.updateConfig({
  stroke: {
    color: '#ff4d4f',
  },
});
```

## getConfig

```ts
const config = lineTool.getConfig();
```

## getFeatures

```ts
const features = lineTool.getFeatures();
```

## getStatus

```ts
const status = lineTool.getStatus();
```
