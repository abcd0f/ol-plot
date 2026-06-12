import LineString from 'ol/geom/LineString';
import Polygon from 'ol/geom/Polygon';
import GeometryCollection from 'ol/geom/GeometryCollection';

/** 旗面高度占旗杆长度的比例 */
const FLAG_HEIGHT_FACTOR = 0.4;

// ─── 旗帜几何计算 ──────────────────────────────────────────────────────────

/**
 * 根据两个控制点生成旗帜的子几何数组。
 *
 * 控制点定义：
 *  - P0: 旗杆顶部（旗帜附着点，同时也是旗面左上角顶点）
 *  - P1: 旗杆底部平移旗帜宽度后的点
 *
 * 即：P1.x 相对 P0.x 的偏移 = 旗面宽度，
 *     P1.y 相对 P0.y 的偏移 = 旗杆长度。
 *
 * 比例关系始终成立：
 *  - flagWidth  = |P1.x - P0.x|（用户直接控制）
 *  - poleLength = |P1.y - P0.y|（用户直接控制）
 *  - flagHeight = poleLength × FLAG_HEIGHT_FACTOR（自动缩放）
 *
 * 返回：
 *  - LineString: 旗杆（从 poleBottom 到 P0），仅描边无填充
 *  - Polygon: 旗面矩形（从 P0 向下延伸 flagHeight、向 P1 方向延伸 flagWidth）
 *
 * @param controlPoints [P0, P1]
 */
export function buildFlagGeometries(controlPoints: number[][]): [LineString, Polygon] {
  const [p0, p1] = controlPoints;

  const dx = p1[0] - p0[0];
  const dy = p1[1] - p0[1];

  const poleLength = Math.abs(dy);
  const flagWidth = Math.abs(dx);
  const flagHeight = poleLength * FLAG_HEIGHT_FACTOR;

  // ── 退化处理 ──
  if (poleLength < 1e-10 || flagWidth < 1e-10) {
    return [
      new LineString([p0.slice(), p1.slice()]),
      new Polygon([[p0.slice(), p0.slice(), p0.slice()]]),
    ];
  }

  // ── 旗杆：从 poleBottom（与 P0 同 X、与 P1 同 Y）到 P0 ──
  const poleBottom: number[] = [p0[0], p0[1] + dy];

  // ── 旗面矩形（附着于 P0，向下延伸 flagHeight，向 P1 方向延伸 flagWidth）──
  // flagTL = P0（旗面左上角 = 旗杆顶部 = 附着点）
  // flagTR：从 P0 向 P1 的 X 方向平移 flagWidth
  // flagBR / flagBL：向下平移 flagHeight
  const flagTL: number[] = [p0[0], p0[1]];
  const flagTR: number[] = [p0[0] + dx, p0[1]];
  const flagBR: number[] = [p0[0] + dx, p0[1] - flagHeight];
  const flagBL: number[] = [p0[0], p0[1] - flagHeight];

  const flagRing = [flagTL, flagTR, flagBR, flagBL, flagTL];

  return [new LineString([poleBottom, p0]), new Polygon([flagRing])];
}

// ─── 控制点反推 ────────────────────────────────────────────────────────────

/**
 * 从 GeometryCollection 反推两个控制点 [P0, P1]。
 *
 * 控制点在 drawend 时由 geometryFunction 存入 `_controlPoints` 属性，
 * 并在 addFeature / drawEnd 时存入 feature `controlPoints` 属性。
 *
 * @param geom 旗帜 GeometryCollection
 * @returns 控制点数组 [P0, P1]
 */
export function getFlagControlPoints(geom: GeometryCollection): number[][] {
  return (geom.get('_controlPoints') as number[][]) || [];
}

// ─── OL Draw 适配 ──────────────────────────────────────────────────────────

/**
 * OL Draw 交互的 geometryFunction，用于实时预览旗帜。
 *
 * Draw 交互以 LineString 模式启动（maxPoints: 2），
 * coordinates 在绘制过程中为 [P0, currentPointer]，
 * 拖拽鼠标时实时更新旗帜预览。
 */
export function createFlagGeometryFunction() {
  return (coordinates: number[][], geometry?: GeometryCollection): GeometryCollection => {
    const geom = geometry || new GeometryCollection([]);

    if (coordinates.length < 2) {
      return geom;
    }

    const controlPoints = coordinates.slice(0, 2);
    const [pole, flag] = buildFlagGeometries(controlPoints);

    geom.setGeometries([pole, flag]);
    geom.set('_controlPoints', controlPoints);

    return geom;
  };
}
