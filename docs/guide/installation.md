---
title: 安装
---

# 安装

## 环境要求

- **Node.js** >= 18
- **pnpm** >= 8（推荐）或 npm / yarn
- **OpenLayers** >= 10.x（peer dependency）

## 使用包管理器安装

::: code-group

```bash [pnpm]
pnpm add ol-plot ol
```

```bash [npm]
npm install ol-plot ol
```

```bash [yarn]
yarn add ol-plot ol
```

:::

## 浏览器兼容性

| 浏览器 | 最低版本 |
|--------|----------|
| Chrome | >= 90 |
| Edge | >= 90 |
| Firefox | >= 90 |
| Safari | >= 15 |

::: warning 注意
`ol-plot` 依赖 OpenLayers 作为 peer dependency，请确保项目中已安装 `ol`。
:::

## CDN 引入

暂不提供 CDN 引入方式，推荐使用包管理器安装以获得完整的 TypeScript 类型支持。

## 下一步

前往 [快速开始](./quickstart) 了解如何在项目中使用 `ol-plot`。
