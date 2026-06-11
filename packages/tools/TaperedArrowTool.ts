import { BaseTool } from '../core/BaseTool';

export class TaperedArrowTool extends BaseTool {}

/**
阅读 packages 目录下现有代码，实现一种新的斜箭头（ObliqueArrow / TaperedArrow）绘图工具。

目标效果参考附件图片。

注意：

该箭头的箭身不是矩形。

箭身宽度从尾部到箭头方向逐渐增大，形成收窄到扩张的过渡效果。

不要实现成普通 StraightArrow。

---

## 图形特征

箭头整体由：

* 渐变箭身
* 箭头头部

组成。

视觉效果：

```text
           tip
          /\
         /  \
        /    \
       /      \
      /        \
     /          \
    /            \
   /              \
  /                \
 /__________________\
```

特点：

* 尾部最窄
* 中部逐渐变宽
* 箭头头部最宽
* 左右完全对称

---

## 绘制规则

仅使用两个控制点。

第一个点：

```text
P0
```

箭尾中心点。

第二个点：

```text
P1
```

箭头尖端点。

示意：

```text
P0 -------------------- P1
```

用户点击两次完成绘制。

---

## Geometry规则

根据：

```ts
const start = P0;
const end = P1;
```

计算：

```ts
direction = normalize(end - start);
normal = perpendicular(direction);

length = distance(start, end);
```

---

## 箭头结构

不要生成矩形箭身。

箭身应采用梯形结构。

宽度沿箭头方向逐渐增加。

定义：

```ts
const TAIL_WIDTH_FACTOR = 0.08;
const NECK_WIDTH_FACTOR = 0.18;
const HEAD_WIDTH_FACTOR = 0.32;

const HEAD_LENGTH_FACTOR = 0.25;
```

要求：

```text
tailWidth
      <
neckWidth
      <
headWidth
```

---

## 顶点结构

计算：

```ts
tailLeft
tailRight

neckLeft
neckRight

headLeft
headRight

tip
```

形成：

```text
                  tip
                 /\
                /  \
               /    \
        headLeft    headRight
             /        \
            /          \
           /            \
      neckLeft        neckRight
           \            /
            \          /
             \        /
       tailLeft    tailRight
```

最终 Polygon：

```ts
[
  tailLeft,
  neckLeft,
  headLeft,
  tip,
  headRight,
  neckRight,
  tailRight,
  tailLeft
]
```

---

## 编辑规则

编辑状态下仅允许存在两个控制点：

```text
P0
P1
```

禁止出现：

* Polygon顶点
* 箭头顶点
* 中间控制点

用户实际编辑的永远只有：

```ts
[start, end]
```

Geometry 根据控制点实时重新生成。

---

## 对称性要求

必须保证：

```text
左侧顶点与右侧顶点
关于箭头中心轴严格镜像
```

禁止出现：

* 左右不对称
* 箭头歪斜
* 箭头头部偏移
* 自交 Polygon

---

## 架构要求

严格遵循 packages 目录现有实现。

参考：

* StraightArrow
* FineArrow
* Rectangle
* Ellipse

实现：

```ts
createObliqueArrowGeometry()

createObliqueArrowGeometryFunction()

ObliqueArrowTool
```

并注册：

```ts
PlotType.OBLIQUE_ARROW
```

通过公共入口导出。

最终提供完整 TypeScript 实现，不要提供伪代码。
 */
