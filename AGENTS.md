# AGENTS.md

> OpenLayers 标绘工具库（`@seedlib/ol-plot`）+ VitePress 文档站（`@ol-plot/docs`）。
> pnpm 工作区 monorepo，根 `src/index.ts` → `dist/`，文档子包在 `docs/`。

## 环境

- Node `22.22.0`（见 `.node-version`），pnpm `10.28.2`（`packageManager`）。
- TypeScript `6.0.3`、tsdown `0.22.2`、ol `10.9.0`、prettier `3.8.3`、eslint `10.4.1`，全部由 `pnpm-workspace.yaml` 的 `catalog` 统一管理。
- 路径别名：`@/*` 指向仓库根（`tsconfig.json` `paths`），目前代码未使用，新建文件如需引入可参考此约定。

## 目录与真实入口

- `src/index.ts`：**唯一的库入口**，`tsdown` 以此为 `entry` 打包到 `dist/`（同时输出 ESM + CJS + `.d.ts`）。
- `packages/`：源码子模块（**不是** 独立 npm 包，没有自己的 `package.json`）：
  - `core/BaseDrawTool.ts` 抽象基类
  - `constants/index.ts` 枚举/常量（`DrawType`/`DrawEvent`/`LINE_DASH`/`ZIndex` 等）
  - `config/{defaultConfig,toolConfigs}.ts` 默认与工具专属配置
  - `types/index.ts` 公共类型与 `IDrawTool`/`DrawToolEventMap`
  - `utils/index.ts` `deepMerge`、`buildStroke`、`assertMap` 等内部工具
  - `tools/` 各 `*Tool.ts` 具体工具类
- `docs/`：VitePress 站点（`@ol-plot/docs`），有自己的 `package.json` 与 `node_modules`。
- `scripts/`：`clean.mjs`（被 `pnpm clean` 调用）、`copy-dists.mjs`、`generate-index.mjs`（**后两个是历史遗留脚本**，引用的 `types/constants/core/interact/line` 等子包目录并不存在，**不要启用它们**）。

## 关键命令（已验证）

| 目的 | 命令 |
| --- | --- |
| 构建库 | `pnpm build`（即 `tsdown`，`clean: true`，会先清空 `dist/`） |
| 本地起文档站 | `pnpm dev:docs`（先 `pnpm build` 再启动 `docs` 的 `vitepress dev`） |
| 文档生产构建 | `pnpm -F @ol-plot/docs run build`（输出到 `docs/.vitepress/dist`，**不是** 根 `dist/`） |
| 清理 | `pnpm clean`（递归删 `node_modules`/`dist`/`.turbo`/`dist.zip`；加 `-- --del-lock` 同时删 `pnpm-lock.yaml`） |
| 格式化 | `pnpm format:write`（仅作用于 `src/**/*.{ts,js}`，**不会** 覆盖 `docs/` 与 `packages/`） |
| Lint 修复 | `pnpm lint:fix`（仅作用于 `{src,apps,libs,test}/**/*.ts`） |

## 已知坑（务必先看）

- `pnpm lint` 与 `pnpm format` 实际分别调用 `pnpm run lint` / `pnpm run format`，会无限递归或直接报错。**不要用**，请用上表中的 `lint:fix` / `format:write`。
- `eslint.config.mjs` 是空文件（0 字节），`pnpm lint:fix` 当前等价于 no-op；新增规则后再启用。
- 没有 `typecheck` 脚本，类型检查只在 `pnpm build` 内部由 `tsdown` 触发。
- 没有测试框架（无 vitest/jest 配置、无 `*.test.ts`）；新增功能若需要测试请先确认方案。
- `docs/.vitepress/config.mts` 的 `outDir` 设为 `../dist`，会与根库构建的 `dist/` **冲突**。不要从根目录直接跑 `vitepress build`；走 `pnpm -F @ol-plot/docs run build`。
- `tsconfig.json` 的 `outDir: ./packages/ol-plot/dist` 是历史遗留，与实际 `tsdown` 构建（输出到 `dist/`）不一致，构建不读它。

## 新增一个标绘工具的流程

约定见 `packages/config/toolConfigs.ts` 头部注释（不要再在 `src/index.ts` 中临时手写 export）：

1. `packages/constants/index.ts` 在 `DrawType` 枚举中添加类型。
2. `packages/config/toolConfigs.ts` 新增 `*_TOOL_CONFIG` 常量，并在 `TOOL_CONFIG_MAP` 注册。
3. `packages/tools/*Tool.ts` 继承 `BaseDrawTool`，实现 `_getDrawType` / `_getToolConfig` / `_buildDrawStyle` / `_buildFinishStyle`。
4. 在 `src/index.ts` 添加 `export { XxxTool } from '../packages/tools/XxxTool';`。
5. `pnpm build` 验证。

> 目前 `LineTool` 是唯一完整实现并导出的工具；`CircleTool` / `ArrowTool` / `RectangleTool` 仅为占位文件。

## 风格约定

- Prettier（`.prettierrc`）：单引号、尾随逗号 `all`、`printWidth: 120`、`tabWidth: 2`、行尾 `auto`、箭头函数总是带括号。
- 库代码注释使用中文（与现有 `packages/` 一致），不要新增与代码语义无关的注释。
- `src/index.ts` 的分组注释（`// ─── 工具类 ───` 等）作为公开 API 的分层标记，新增导出请沿用相同分组与分隔线。

## 其他提示

- `ol` 被打包为 `external`（`tsdown.config.ts`），库的消费方需自备 `ol` 依赖；不要在源码里 `npm` 安装到本库。
- 工作区启用 `link-workspace-packages=true` 与 `shared-workspace-lockfile=true`（`.npmrc`）。
- 仓库无 CI 配置（`.github/workflows/` 不存在），无 `README`/`CHANGELOG`/`CONTRIBUTING`。
