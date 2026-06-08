# ol-plot — Codebase Reference for AI

> Machine-readable reference for the `packages/` library. Covers architecture, public API, internal classes, data flow, and key design decisions.

---

## 1. Overview

`ol-plot` is a TypeScript drawing/editing toolkit built on top of **OpenLayers (OL)**. It provides tool classes for drawing and interactively editing geometric shapes (line, freehand line, polygon, rectangle, circle) on an OL map.

Each tool is self-contained: it owns its own OL layer, draw interaction, select interaction, and modify interaction, coordinated through an internal EventBus.

---

## 2. Public Exports (`packages/index.ts`)

### Core classes
| Export | Source |
|---|---|
| `BaseTool` | `core/BaseTool.ts` |
| `EventBus` | `core/EventBus.ts` |
| `LayerManager` | `core/LayerManager.ts` |
| `DrawManager` | `core/DrawManager.ts` |
| `SelectManager` | `core/SelectManager.ts` |
| `ModifyManager` | `core/ModifyManager.ts` |

### Tool classes
| Export | Source | OL geometry |
|---|---|---|
| `LineTool` | `tools/LineTool.ts` | `LineString` |
| `FreehandLineTool` | `tools/FreehandLineTool.ts` | `LineString` (freehand) |
| `PolygonTool` | `tools/PolygonTool.ts` | `Polygon` |
| `RectangleTool` | `tools/RectangleTool.ts` | `Polygon` (axis-aligned box) |
| `CircleTool` | `tools/CircleTool.ts` | `Circle` |

### Constants & types
| Export | Description |
|---|---|
| `DrawType` | Enum of supported draw types |
| `DrawEvent` | Event name constants |
| `DEFAULT_CONFIG` | Default style configuration |
| `PlotConfig` | Style configuration interface |
| `NodeStyle` | Vertex handle style interface |
| `DrawEventType` | Union type of all event strings |

---

## 3. Configuration

### `PlotConfig` interface (`types/config.ts`)
```ts
interface PlotConfig {
  strokeColor?: string;    // default '#2196f3'
  strokeWidth?: number;    // default 2
  fillColor?: string;      // default 'rgba(33,150,243,0.15)'
  lineDash?: number[];     // e.g. [10,5] for dashed; [] = solid (default)
  nodeStyle?: NodeStyle;
}

interface NodeStyle {
  radius?: number;         // vertex handle radius, default 6
  fill?: string;           // vertex fill, default '#ffffff'
  stroke?: string;         // vertex stroke, default matches strokeColor
  strokeWidth?: number;    // vertex stroke width, default 2
}
```

`DEFAULT_CONFIG` (`constants/defaultConfig.ts`) supplies all required defaults. `mergeConfig()` in `utils/index.ts` deep-merges user config over defaults.

---

## 4. Constants

### `DrawType` enum (`constants/drawType.ts`)
```ts
enum DrawType {
  Point        = 'Point',
  Line         = 'LineString',
  FreehandLine = 'FreehandLine',   // not a native OL type; mapped in DrawManager
  Polygon      = 'Polygon',
  Rectangle    = 'Rectangle',      // not a native OL type; mapped to Circle+createBox
  Circle       = 'Circle',
}
```

### `DrawEvent` object (`constants/events.ts`)
```ts
const DrawEvent = {
  DRAW_START:   'drawstart',
  DRAW_END:     'drawend',
  DRAW_ABORT:   'drawabort',
  MODIFY_START: 'modifystart',
  MODIFY_END:   'modifyend',
  SELECT:       'select',
  DESELECT:     'deselect',
}
```

---

## 5. Core Classes

### 5.1 `EventBus` (`core/EventBus.ts`)

Internal pub/sub bus. Extends OL's `Target` so events are first-class OL events.

```
EventBus
  .on(event, handler)    — subscribe
  .off(event, handler)   — unsubscribe
  .emit(event, ...args)  — publish (args passed as spread to handlers)
  .clear()               — remove all listeners
```

Internally wraps each handler in an OL-compatible wrapper (`PlotEvent extends BaseEvent`) and stores the mapping in a nested `Map<type, Map<handler, wrapper>>`.

Each tool instance has its own private `EventBus` — there is no global bus.

---

### 5.2 `LayerManager` (`core/LayerManager.ts`)

Manages a single `VectorLayer` + `VectorSource` on the map.

```
LayerManager(map, style)
  .getSource()       → VectorSource
  .getLayer()        → VectorLayer
  .getFeatures()     → Feature[]
  .addFeature(f)
  .clear()
  .destroy()         — removes layer from map
```

---

### 5.3 `DrawManager` (`core/DrawManager.ts`)

Wraps OL's `Draw` interaction. Handles type mapping for non-native types.

```
DrawManager(map, source, eventBus)
  .activate(drawType)   — creates and adds Draw interaction; emits DRAW_START / DRAW_END
  .deactivate()         — removes Draw interaction
  .destroy()
```

**Type mapping:**
- `DrawType.Rectangle` → OL type `'Circle'` + `createBox()` geometry function
- `DrawType.FreehandLine` → OL type `'LineString'` + `freehand: true`
- All other types → passed directly to OL as-is

---

### 5.4 `SelectManager` (`core/SelectManager.ts`)

Wraps OL's `Select` interaction (click-to-select, single feature).

```
SelectManager(map, layer, config, eventBus)
  .getSelectedFeatures()   → Collection<Feature>
  .selectFeature(f)        — programmatic select; emits SELECT
  .clearSelection()        — emits DESELECT
  .setActive(bool)
  .destroy()
```

Emits:
- `SELECT` with `{ feature }` when a feature is clicked
- `DESELECT` with `{ features }` when selection is cleared

---

### 5.5 `ModifyManager` (`core/ModifyManager.ts`)

Wraps OL's `Modify` interaction on the selected features collection.

```
ModifyManager(map, selectedFeatures, config, eventBus)
  .setActive(bool)
  .destroy()
```

Emits:
- `MODIFY_START` (no payload) when vertex drag begins
- `MODIFY_END` with `{ features }` when drag ends

---

### 5.6 `BaseTool` (`core/BaseTool.ts`) — abstract

Base class for all tools. Composes the five managers above and manages their lifecycle.

```
BaseTool(map, config?)
  — Lifecycle —
  .activate()             → this   — start drawing mode
  .deactivate()           → this   — stop drawing, enable select/modify
  .destroy()              — remove all interactions and the layer

  — Feature management —
  .addFeature(coords)     → Feature   — create feature from coordinates (map projection)
  .selectFeature(feature) → this      — programmatically select and enable editing
  .getFeatures()          → Feature[]
  .clearFeatures()        → this

  — Events —
  .on(event, handler)     → this
  .off(event, handler)    → this

  — Abstract (implemented by each tool) —
  .createGeometry(coords) → Geometry  (protected)
  .setCoordinates(coords)
  .getCoordinates()       → number[][]
  .getPointCount()        → number
  .updatePoint(index, coord)
```

**Internal lifecycle (BaseTool.bindEvents):**
1. `DRAW_END` → stores `activeFeature`, deactivates draw, activates select+modify, auto-selects the new feature
2. `SELECT` → stores `activeFeature`
3. `DESELECT` → clears `activeFeature`

**Coordinate convention:** all coordinates are in the map's projection (e.g. EPSG:3857). Use `ol/proj.fromLonLat` to convert from WGS84 before passing in.

---

## 6. Tool Classes

All tools extend `BaseTool`. They implement the four abstract methods and set `this.drawType` in the constructor.

### 6.1 `LineTool`
- Geometry: `LineString`
- Draw: click to add points; double-click to finish
- `getCoordinates()` → `[x,y][]` — full point list
- `getPointCount()` → number of points

### 6.2 `FreehandLineTool`
- Geometry: `LineString`
- Draw: hold mouse button and drag; release to finish (OL `freehand: true`)
- API identical to `LineTool`; produces many densely-packed points

### 6.3 `PolygonTool`
- Geometry: `Polygon` (single ring, no holes)
- Draw: click to add vertices; double-click or click first point to close
- `getCoordinates()` → outer ring **without** closing point (i.e. first ≠ last)
- `getPointCount()` → vertex count excluding the closing duplicate
- `updatePoint(i, coord)` — also updates the closing point if `i === 0`

### 6.4 `RectangleTool`
- Geometry: `Polygon` (5-point ring: 4 corners + closing = first)
- Draw: click-drag to define bounding box
- **Rectangle constraint:** a geometry `change` listener enforces axis-alignment on every edit. Dragging any corner propagates the correct X/Y to the two adjacent corners while keeping the diagonal corner fixed.
- `getCoordinates()` → 4 corners `[BL, TL, TR, BR]` (no closing point)
- `setCoordinates(coords)` → recomputes bounding box via `bboxRect` before writing

**Rectangle constraint implementation details:**

Ring order from OL's `createBox`: `[BL, TL, TR, BR, BL]` (indices 0-3, index 4 = closing).

Sharing relationships used to propagate a moved corner:
```
SHARE_X = [1, 0, 3, 2]  // index that shares the same vertical edge
SHARE_Y = [3, 2, 1, 0]  // index that shares the same horizontal edge
```

When corner `i` moves to `moved`:
```
next[i]            = moved
next[SHARE_X[i]]   = [moved.x, prev.y]   // same X, keep Y
next[SHARE_Y[i]]   = [prev.x, moved.y]   // keep X, same Y
```

**Known OL Modify issue and fix:** OL's Modify interaction caches vertex references at drag start. When `setCoordinates()` is called externally (from our constraint handler), OL's cache becomes stale. On each subsequent mouse-move event, OL resets non-dragged vertices to their pre-drag values. Comparing the incoming geometry against `prevCorners` (our last constrained values) would mis-identify the dragged corner when the drag delta is small.

Fix: `dragStartCorners` is captured at `MODIFY_START`. The change handler compares against `dragStartCorners ?? prevCorners` to detect the moved corner. Since OL always sends non-dragged vertices at their dragStart values, this comparison is always reliable.

### 6.5 `CircleTool`
- Geometry: `Circle` (OL native)
- Draw: click-drag; start = center, end = circumference point
- `getCoordinates()` → `[center, [center.x + radius, center.y]]` (2-element array)
- `setCoordinates([[cx,cy],[rx,ry]])` — center from [0], radius from `dist([0],[1])`
- Extra methods (not on `BaseTool`):
  ```
  .addCircle(center, radius)   → Feature
  .getCenter()                 → number[] | null
  .getRadius()                 → number
  .setRadius(r)
  .setCenter(c)
  ```

---

## 7. Utilities (`utils/index.ts`)

| Function | Signature | Description |
|---|---|---|
| `mergeConfig` | `(config?) → Required<PlotConfig>` | Deep-merge user config over DEFAULT_CONFIG |
| `buildFeatureStyle` | `(config) → Style` | Normal feature style (stroke + fill) |
| `buildSelectStyle` | `(config) → Style[]` | Feature style + vertex dots overlay |
| `buildModifyStyle` | `(config) → Style[]` | Modify handle style (larger circle ring) |

`extractVertices(feature)` is an internal helper that reads coordinates from any supported geometry type for the vertex overlay in `buildSelectStyle`.

---

## 8. Data Flow

### 8.1 Drawing a new shape
```
user calls tool.activate()
  └─ drawManager.activate(drawType)
       └─ OL Draw interaction added to map

user draws on map
  └─ OL fires 'drawend'
       └─ DrawManager emits DRAW_END { feature }
            └─ BaseTool.bindEvents:
                 activeFeature = feature
                 drawManager.deactivate()
                 selectManager.setActive(true)
                 modifyManager.setActive(true)
                 selectManager.selectFeature(feature)
                   └─ emits SELECT { feature }
```

### 8.2 Editing a shape
```
user clicks feature
  └─ OL Select fires 'select'
       └─ SelectManager emits SELECT { feature }
            └─ BaseTool: activeFeature = feature

user drags a vertex
  └─ OL Modify fires 'modifystart'
       └─ ModifyManager emits MODIFY_START
            └─ RectangleTool: dragStartCorners = copy of prevCorners

  └─ OL geometry.change fires on each mouse-move
       └─ RectangleTool.attachConstraint handler:
            detects moved corner (vs dragStartCorners)
            applies rectangle constraint
            calls geom.setCoordinates(corrected)
            updates prevCorners

  └─ OL Modify fires 'modifyend'
       └─ ModifyManager emits MODIFY_END { features }
            └─ RectangleTool: dragStartCorners = null
```

### 8.3 Loading existing data
```ts
const feature = tool.addFeature(coordinates);  // coordinates in map projection
tool.selectFeature(feature);                    // optional: make it editable immediately
```

---

## 9. Adding a New Tool — Checklist

1. Add entry to `DrawType` enum in `constants/drawType.ts`
2. If the new type needs special OL Draw options, handle it in `DrawManager.activate()`
3. Create `tools/YourTool.ts` extending `BaseTool`; implement the 4 abstract methods + `createGeometry`
4. Export from `packages/index.ts`

If the tool needs geometry constraints during editing (like `RectangleTool`), listen to `MODIFY_START` / `MODIFY_END` via `this.eventBus` and attach a `geom.on('change', ...)` listener in response to `DRAW_END` / `SELECT`.

---

## 10. File Map

```
packages/
├── index.ts                    — barrel exports
├── types/
│   ├── config.ts               — PlotConfig, NodeStyle interfaces
│   └── index.ts
├── constants/
│   ├── drawType.ts             — DrawType enum
│   ├── events.ts               — DrawEvent names + DrawEventType
│   ├── defaultConfig.ts        — DEFAULT_CONFIG
│   └── index.ts
├── core/
│   ├── EventBus.ts             — internal pub/sub on OL Target
│   ├── LayerManager.ts         — VectorLayer + VectorSource wrapper
│   ├── DrawManager.ts          — OL Draw interaction, type mapping
│   ├── SelectManager.ts        — OL Select interaction (click)
│   ├── ModifyManager.ts        — OL Modify interaction (vertex drag)
│   └── BaseTool.ts             — abstract base; composes all managers
├── tools/
│   ├── LineTool.ts             — LineString, click-to-add-points
│   ├── FreehandLineTool.ts     — LineString, drag-to-draw
│   ├── PolygonTool.ts          — Polygon, click-to-add-vertices
│   ├── RectangleTool.ts        — axis-aligned Polygon, constraint handler
│   └── CircleTool.ts           — OL Circle, center+radius
└── utils/
    └── index.ts                — mergeConfig, style builders
```
