ol-plot/

│
└── packages/
    ├── index.ts                    # 统一导出入口
    ├── types/
    │   ├── index.ts
    │   └── config.ts               # PlotConfig, NodeStyle
    ├── constants/
    │   ├── index.ts
    │   ├── drawType.ts             # DrawType 枚举
    │   ├── events.ts               # DrawEvent 事件常量
    │   ├── toolState.ts            # ToolState 枚举
    │   ├── defaultConfig.ts        # DEFAULT_CONFIG
    │   └── mergeConfig.ts          # 配置合并
    ├── core/
    │   ├── EventBus.ts             # 事件总线（基于 OL Target）
    │   ├── BaseTool.ts             # 抽象工具基类
    │   ├── LayerManager.ts         # 矢量图层管理
    │   ├── DrawManager.ts          # 绘制交互管理
    │   ├── SelectManager.ts        # 选择交互管理
    │   └── ModifyManager.ts        # 编辑交互管理
    ├── geometry/                   # 形状几何计算
    │   ├── index.ts
    │   ├── rectangle.ts
    │   ├── ellipse.ts
    │   ├── sector.ts
    │   ├── arc.ts
    │   └── arrow/
    │       ├── index.ts
    │       ├── straight.ts
    │       ├── tapered.ts
    │       └── line.ts
    ├── utils/                      # 纯通用工具（零 OL 依赖）
    │   ├── index.ts
    │   └── math.ts                     # dist, computeDirectionAndNormal, createDegeneratePolygon
    ├── style/                      # OL Style 工厂
    │   ├── index.ts
    │   ├── feature.ts              # buildFeatureStyle
    │   ├── draw.ts                 # buildDrawStyle
    │   ├── select.ts               # buildSelectStyle + extractVertices
    │   └── modify.ts               # buildModifyStyle
    ├── helper/                     # 内部共享工具
    │   └── handle.ts               # HandleManager
    └── tools/                      # 工具实现
        ├── PointTool.ts
        ├── LineTool.ts
        ├── FreehandLineTool.ts
        ├── PolygonTool.ts
        ├── RectangleTool.ts
        ├── CircleTool.ts
        ├── EllipseTool.ts
        ├── SectorTool.ts
        ├── StraightArrowTool.ts
        ├── TaperedArrowTool.ts
        ├── LineArrowTool.ts
        └── ArcTool.ts
