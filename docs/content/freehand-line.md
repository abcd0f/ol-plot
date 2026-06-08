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

<demo vue="../examples/free-line/index.vue" />
