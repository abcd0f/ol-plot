# 距离环 RangeRingsTool

距离环工具由两个点确定：第一个点是圆心，第二个点决定最大覆盖半径。工具按 `rangeRings.spacing` 和 `rangeRings.unit` 绘制多个不填充的同心圆，并在每个圆外侧显示半径标签。

```ts
import { RangeRingsTool } from '@seedlib/ol-plot'

const tool = new RangeRingsTool(map, {
  rangeRings: { spacing: 50, unit: 'nm' },
})
```

支持的单位为 `m`、`km` 和 `nm`。例如 `{ spacing: 5, unit: 'm' }`、`{ spacing: 1.5, unit: 'km' }`、`{ spacing: 50, unit: 'nm' }`。第二个点只决定覆盖范围，最大半径不是间距整数倍时，不绘制超出范围的不完整环。

点击任意圆环会选中整个距离环标绘，并显示圆心和外侧控制点；拖动控制点可以整体移动或调整覆盖半径。
