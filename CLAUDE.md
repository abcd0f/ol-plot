# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**@seedlib/ol-plot** is an OpenLayers plotting library that provides interactive drawing tools for maps. The library follows a layered architecture with clear separation between geometry calculations, OpenLayers-specific code, and tool implementations.

## Development Commands

### Build & Development
```bash
pnpm build              # Build library using tsdown (ESM, CJS, IIFE formats)
pnpm dev:docs           # Run VitePress documentation dev server
pnpm clean              # Clean build artifacts
```

### Code Quality
```bash
pnpm lint:fix           # Fix ESLint issues
pnpm format:write       # Format code with Prettier
```

### Documentation
```bash
pnpm -F @ol-plot/docs run dev      # Run docs dev server (alternative)
pnpm -F @ol-plot/docs run build    # Build documentation
pnpm -F @ol-plot/docs run preview  # Preview built docs
```

## Architecture

### Core Design Principles

1. **Zero OpenLayers dependency in `utils/`**: The `utils/` directory contains pure mathematical functions with no OL dependencies. This enables easier testing and potential reuse.

2. **Manager Pattern**: Core functionality is split into focused managers:
   - `EventBus.ts` - Event system (based on OL Target)
   - `LayerManager.ts` - Vector layer management
   - `DrawManager.ts` - Drawing interaction management
   - `SelectManager.ts` - Selection interaction management
   - `ModifyManager.ts` - Edit interaction management

3. **Tool Inheritance**: All tools extend `BaseTool` abstract class, which provides common lifecycle methods and state management.

### Directory Structure

```
packages/
├── index.ts                 # Main export entry point
├── types/                   # TypeScript type definitions
│   ├── config.ts           # PlotConfig, NodeStyle interfaces
├── constants/               # Enums and constants
│   ├── drawType.ts         # DrawType enum (POINT, LINE, POLYGON, etc.)
│   ├── events.ts           # DrawEvent constants
│   ├── toolState.ts        # ToolState enum
│   └── defaultConfig.ts    # DEFAULT_CONFIG
├── core/                    # Core managers and base classes
│   ├── BaseTool.ts         # Abstract tool base class
│   ├── EventBus.ts         # Event system
│   ├── LayerManager.ts     # Layer management
│   ├── DrawManager.ts      # Drawing interactions
│   ├── SelectManager.ts    # Selection interactions
│   └── ModifyManager.ts    # Edit interactions
├── geometry/                # Shape calculation algorithms (OL-independent)
│   ├── rectangle.ts
│   ├── ellipse.ts
│   ├── sector.ts
│   ├── arc.ts
│   └── arrow/              # Arrow geometry calculations
│       ├── straight.ts
│       ├── tapered.ts
│       └── line.ts
├── utils/                   # Pure utility functions (ZERO OL dependencies)
│   └── math.ts             # dist, computeDirectionAndNormal, etc.
├── style/                   # OpenLayers Style factories
│   ├── feature.ts          # buildFeatureStyle
│   ├── draw.ts             # buildDrawStyle
│   ├── select.ts           # buildSelectStyle + extractVertices
│   └── modify.ts           # buildModifyStyle
├── helper/                  # Internal shared utilities
│   └── handle.ts           # HandleManager
└── tools/                   # Concrete tool implementations
    ├── PointTool.ts
    ├── LineTool.ts
    ├── PolygonTool.ts
    ├── RectangleTool.ts
    ├── CircleTool.ts
    ├── EllipseTool.ts
    ├── SectorTool.ts
    ├── StraightArrowTool.ts
    ├── TaperedArrowTool.ts
    ├── LineArrowTool.ts
    └── ArcTool.ts
```

## Key Architectural Patterns

### Tool Lifecycle
All tools follow this lifecycle:
1. Extend `BaseTool` abstract class
2. Implement required abstract methods
3. Use managers (DrawManager, SelectManager, ModifyManager) for OL interactions
4. Emit events through EventBus

### Geometry Calculation Flow
1. User interaction triggers draw events
2. Tool collects coordinates
3. Geometry module calculates shape coordinates (pure functions)
4. Coordinates converted to OL geometries
5. Styles applied through style factories

### Style System
Styles are built through factory functions:
- `buildFeatureStyle()` - Final feature appearance
- `buildDrawStyle()` - During drawing
- `buildSelectStyle()` - Selected features
- `buildModifyStyle()` - During editing

## Build System

Uses **tsdown** to generate multiple output formats:
- **ESM/CJS**: Main distribution formats with type declarations
- **IIFE**: Browser bundle as `OlPlot` global (in `dist/browser/`)

Build config is in [tsdown.config.ts](tsdown.config.ts).

## Documentation

VitePress-based documentation with:
- Interactive examples using `vitepress-demo-plugin`
- Enhanced readability plugin
- Custom markdown containers

Source: [docs/](docs/)

## Adding New Tools

When adding a new drawing tool:

1. Create tool class in `packages/tools/` extending `BaseTool`
2. Add corresponding `DrawType` enum value in `constants/drawType.ts`
3. If complex geometry, add calculation function in `packages/geometry/`
4. Export tool from `packages/index.ts`
5. Add documentation example in `docs/examples/`
6. Update docs config in `docs/.vitepress/config.mts`

## Notes

- The library uses OpenLayers 10.8.0+ as a peer dependency
- Package manager is pinned to pnpm@10.28.2
- TypeScript version is 6.0.3 (catalog reference)
