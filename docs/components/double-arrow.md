---
title: 双箭头
---

# 双箭头 DoubleArrow

用于在地图上绘制双箭头标绘图形。绘制时由 4 个点确定基础形态，完成后自动生成中间连接点，编辑时显示 5 个控制点。

## 基础用法

依次点击两个底部控制点，再点击两个箭头尖端点完成绘制。编辑时可拖拽两个底点、两个箭头尖端和中间连接点。

<demo vue="../examples/double-arrow/basic.vue" />

## 绘制行为

- **绘制方式**：依次点击 4 个点（底点 P0 → 底点 P1 → 箭头尖端 P2 → 箭头尖端 P3）
- **几何类型**：`ol/geom/Polygon`
- **坐标表示**：绘制完成后保存 5 个控制点，P4 为自动生成的中间连接点

## 编辑行为

使用自定义 Handle 编辑模式（禁用默认 ModifyManager）。双箭头 Polygon 由大量插值点组成，不适合直接编辑，因此只暴露控制点：

- 选中要素时显示 5 个控制点
- 拖拽控制点时重新计算整个双箭头 Polygon
- 取消选中时隐藏控制点

## 控制点

| 控制点 | 说明 |
| ------ | ---- |
| P0 | 底部第一个控制点 |
| P1 | 底部第二个控制点 |
| P2 | 第一个箭头尖端点 |
| P3 | 第二个箭头尖端点 |
| P4 | 中间连接点，绘制完成后自动生成 |

## 使用示例

```ts
import { DoubleArrowTool } from 'ol-plot';

const tool = new DoubleArrowTool(map, {
  strokeColor: '#722ed1',
  strokeWidth: 2,
  fillColor: 'rgba(114, 46, 209, 0.15)',
});
```

## 程序化添加

`addDoubleArrow` 支持传入 3、4 或 5 个控制点：

```ts
tool.addDoubleArrow(
  [12956000, 4855000],
  [12962000, 4855000],
  [12965000, 4860000],
  [12953000, 4860000],
);
```

- 3 点：自动计算对称的第二个箭头尖端和连接点
- 4 点：自动计算连接点
- 5 点：完全使用传入控制点

## Methods

| 方法名 | 说明 | 参数 | 返回值 |
| ------ | ---- | ---- | ------ |
| `addDoubleArrow(p1, p2, p3, p4?, connPoint?)` | 程序化添加双箭头 | `number[]` 控制点 | `Feature` |
| `getConnectionPoint()` | 获取中间连接点 | — | `number[] \| null` |
| `getCoordinates()` | 获取当前控制点 | — | `number[][]` |
| `setCoordinates(coords)` | 设置控制点并重建图形 | `number[][]` | `void` |
| `updatePoint(index, coord)` | 更新指定控制点 | `index: number`, `coord: number[]` | `void` |
