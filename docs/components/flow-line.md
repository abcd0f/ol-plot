---
title: 流动线
---

# 流动线 FlowLine

用于绘制带内部流动箭头的轨迹线。交互方式与折线一致：单击添加顶点，双击结束，完成后自动进入编辑状态。

<demo vue="../examples/flow-line/basic.vue" />

## 绘制行为

- **绘制方式**：单击添加节点，双击结束绘制
- **几何类型**：`ol/geom/LineString`
- **几何样式**：基础描边 + 沿线流动箭头

## 配置

```ts
import { FlowLineTool } from 'ol-plot'

const tool = new FlowLineTool(map, {
  strokeColor: '#00b96b',
  strokeWidth: 4,
  flowLine: {
    arrowColor: '#ffffff',
    arrowSpacing: 52,
    speed: 72,
  },
})
```

```ts
interface FlowLineConfig {
  arrowColor?: string
  arrowSpacing?: number
  speed?: number
}
```

坐标、事件、清空、删除等 API 与 `LineTool` 一致。
