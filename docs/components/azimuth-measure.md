---
title: 方位测量
---

# 方位测量 AzimuthMeasureTool

## 基础用法

`AzimuthMeasureTool` 点击两个点完成一次测量，标签显示两点间距离和方位角。方位角以正北为 `0°`，按顺时针方向增加到 `360°`。

```ts
import { AzimuthMeasureTool } from '@seedlib/ol-plot'

const tool = new AzimuthMeasureTool(map, {
  azimuthMeasure: {
    unit: 'km', // 'm' | 'km' | 'nm'
  },
})
```

方位测量支持以下距离单位：

- `m`：米
- `km`：千米
- `nm`：海里

工具只允许两个控制点，编辑控制点后距离和方位角会实时更新。
