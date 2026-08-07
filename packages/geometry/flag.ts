import LineString from 'ol/geom/LineString';
import Polygon from 'ol/geom/Polygon';
import GeometryCollection from 'ol/geom/GeometryCollection';

/** 旗面高度占旗杆长度的比例 */
const FLAG_HEIGHT_FACTOR = 0.4;
/** 旗面宽高比，保持原来常见等宽拖拽时的视觉比例 */
const FLAG_ASPECT_RATIO = 1 / (FLAG_HEIGHT_FACTOR * 1.5);
const EPSILON = 1e-10;

// ─── 旗帜几何计算 ──────────────────────────────────────────────────────────

/**
 * 根据两个控制点生成旗帜的子几何数组。
 *
 * 控制点定义：
 *  - P0: 旗面贴杆侧的一个顶点
 *  - P1: 旗杆尾部横向平移到旗面尾边后的点
 *
 * 即：P1.x 相对 P0.x 的方向 = 旗面展开方向，
 *     P1.y 相对 P0.y 的偏移 = 旗杆长度。
 *
 * 比例关系始终成立：
 *  - poleLength = |P1.y - P0.y|（用户直接控制）
 *  - flagHeight = poleLength × FLAG_HEIGHT_FACTOR
 *  - flagWidth  = flagHeight × FLAG_ASPECT_RATIO
 *
 * 返回：
 *  - LineString: 旗杆（从 poleBottom 到 P0），仅描边无填充
 *  - Polygon: 旗面矩形（从 P0 向 P1 的纵向和横向展开）
 *
 * @param controlPoints [P0, P1]
 */
export function buildFlagGeometries(controlPoints: number[][]): [LineString, Polygon] {
  if (controlPoints.length < 2) {
    return [new LineString([]), new Polygon([])];
  }

  const [p0, p1] = normalizeFlagControlPoints(controlPoints);

  const dx = p1[0] - p0[0];
  const dy = p1[1] - p0[1];

  const poleLength = Math.abs(dy);
  const flagHeight = poleLength * FLAG_HEIGHT_FACTOR;

  // ── 退化处理 ──
  if (poleLength < EPSILON) {
    return [new LineString([p0.slice(), p1.slice()]), new Polygon([[p0.slice(), p0.slice(), p0.slice()]])];
  }

  // ── 旗杆：从 poleBottom（与 P0 同 X、与 P1 同 Y）到 P0 ──
  const poleBottom: number[] = [p0[0], p0[1] + dy];

  // ── 旗面矩形：P0 始终是贴杆侧顶点，纵向跟随 P1 位于 P0 的上方或下方 ──
  const flagVerticalOffset = Math.sign(dy) * flagHeight;
  const flagPoleStart: number[] = [p0[0], p0[1]];
  const flagTailStart: number[] = [p0[0] + dx, p0[1]];
  const flagTailEnd: number[] = [p0[0] + dx, p0[1] + flagVerticalOffset];
  const flagPoleEnd: number[] = [p0[0], p0[1] + flagVerticalOffset];

  const flagRing = [flagPoleStart, flagTailStart, flagTailEnd, flagPoleEnd, flagPoleStart];

  return [new LineString([poleBottom, p0]), new Polygon([flagRing])];
}

/**
 * 归一化旗帜控制点。
 *
 * P0 保持为旗面贴杆侧顶点；P1 保持用户给出的纵向尾部位置，
 * 横向位置按固定宽高比修正到真实旗面尾边。
 */
export function normalizeFlagControlPoints(controlPoints: number[][]): number[][] {
  if (controlPoints.length < 2) return controlPoints.slice();

  const [p0, p1] = controlPoints;
  const dy = p1[1] - p0[1];
  if (Math.abs(dy) < EPSILON) return [p0.slice(), p1.slice()];

  const dx = p1[0] - p0[0];
  const horizontalDirection = Math.abs(dx) < EPSILON ? 1 : Math.sign(dx);
  const poleLength = Math.abs(dy);
  const flagHeight = poleLength * FLAG_HEIGHT_FACTOR;
  const flagWidth = flagHeight * FLAG_ASPECT_RATIO;

  return [p0.slice(), [p0[0] + horizontalDirection * flagWidth, p1[1]]];
}

// ─── 控制点反推 ────────────────────────────────────────────────────────────

/**
 * 从 GeometryCollection 反推两个控制点 [P0, P1]。
 *
 * 控制点在 drawend 时由 geometryFunction 存入 `_controlPoints` 属性，
 * 并在创建 / drawEnd 时存入 feature `controlPoints` 属性。
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

    const controlPoints = normalizeFlagControlPoints(coordinates.slice(0, 2));
    const [pole, flag] = buildFlagGeometries(controlPoints);

    geom.setGeometries([pole, flag]);
    geom.set('_controlPoints', controlPoints);

    return geom;
  };
}
