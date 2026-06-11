---
title: 事件系统
---

# 事件系统

`ol-plot` 通过事件驱动的方式管理绘制、选择和编辑的全生命周期。所有工具实例共享统一的事件模型。

## 事件订阅

使用 `on()` 监听事件，使用 `off()` 移除监听：

```ts
tool.on(eventName, handler)
tool.off(eventName, handler)
```

所有 `on()` / `off()` 方法返回 `this`，支持链式调用：

```ts
tool
  .on(DrawEvent.DRAW_END, handleDrawEnd)
  .on(DrawEvent.SELECT, handleSelect)
  .on(DrawEvent.MODIFY_END, handleModifyEnd)
```

## 事件列表

| 事件常量 | 字符串值 | 触发时机 | 回调参数 |
|----------|----------|----------|----------|
| `DrawEvent.DRAW_START` | `'drawstart'` | 开始绘制（落笔/按下鼠标） | `{ feature: Feature }` |
| `DrawEvent.DRAW_END` | `'drawend'` | 完成一次绘制（抬笔/松开鼠标） | `{ feature: Feature }` |
| `DrawEvent.DRAW_ABORT` | `'drawabort'` | 绘制被中止 | — |
| `DrawEvent.MODIFY_START` | `'modifystart'` | 开始拖拽控制点 | — |
| `DrawEvent.MODIFY_END` | `'modifyend'` | 拖拽控制点结束 | `{ features: Feature[] }` |
| `DrawEvent.SELECT` | `'select'` | 点击选中要素 | `{ feature: Feature }` |
| `DrawEvent.DESELECT` | `'deselect'` | 取消选中要素 | `{ features: Feature[] }` |
| `DrawEvent.DELETE` | `'delete'` | 删除选中要素（按 Delete / Backspace） | `{ feature: Feature }` |

## 完整生命周期示例

```ts
import { LineTool, DrawEvent } from 'ol-plot'

const tool = new LineTool(map)

tool
  .on(DrawEvent.DRAW_START, ({ feature }) => {
    console.log('开始绘制')
  })
  .on(DrawEvent.DRAW_END, ({ feature }) => {
    console.log('绘制完成，坐标：', tool.getCoordinates())
    // 此处可以保存数据到后端
  })
  .on(DrawEvent.SELECT, ({ feature }) => {
    console.log('选中要素')
  })
  .on(DrawEvent.DESELECT, ({ features }) => {
    console.log('取消选中')
  })
  .on(DrawEvent.MODIFY_START, () => {
    console.log('开始编辑')
  })
  .on(DrawEvent.MODIFY_END, ({ features }) => {
    console.log('编辑结束，新坐标：', tool.getCoordinates())
    // 此处可以同步更新后端数据
  })
  .on(DrawEvent.DELETE, ({ feature }) => {
    console.log('要素已删除')
  })
```

## 事件触发顺序

一次典型的绘制 → 编辑 → 取消选中流程：

```
1. 点击空白区域开始绘制
   → DRAW_START

2. 完成绘制（双击或松开鼠标）
   → DRAW_END
   → SELECT（自动选中）

3. 拖拽控制点
   → MODIFY_START
   → MODIFY_END

4. 点击空白取消选中
   → DESELECT（回到绘制态，可继续绘制）
```

## 注意事项

- 事件回调在工具内部的 EventBus 上触发，不同工具实例的事件相互隔离
- 绘制完成后，`DRAW_END` 和 `SELECT` 事件会依次触发
- 销毁工具后，所有已注册的事件监听器将被清除
- 建议在 `onUnmounted` 中调用 `tool.destroy()` 以确保事件正确清理
