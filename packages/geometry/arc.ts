import LineString from 'ol/geom/LineString';
import { dist } from '../utils';

const DEFAULT_SEGMENTS = 64;

/**
 * 计算三个不共线点确定的外接圆圆心和半径。
 * 使用垂直平分线交点法。
 *
 * @param p0 第一个点（圆弧起点）
 * @param p1 第二个点（圆弧终点）
 * @param p2 第三个点（圆弧经过点）
 * @returns 圆心坐标和半径，如果三点共线则返回 null
 */
function getCircleFromThreePoints(
  p0: number[],
  p1: number[],
  p2: number[],
): { center: number[]; radius: number } | null {
  const [x0, y0] = p0;
  const [x1, y1] = p1;
  const [x2, y2] = p2;

  // 检查三点是否共线（使用叉积）
  const cross = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0);
  if (Math.abs(cross) < 1e-10) {
    return null;
  }

  // 计算外接圆圆心
  const D = 2 * (x0 * (y1 - y2) + x1 * (y2 - y0) + x2 * (y0 - y1));

  const centerX =
    ((x0 * x0 + y0 * y0) * (y1 - y2) + (x1 * x1 + y1 * y1) * (y2 - y0) + (x2 * x2 + y2 * y2) * (y0 - y1)) / D;

  const centerY =
    ((x0 * x0 + y0 * y0) * (x2 - x1) + (x1 * x1 + y1 * y1) * (x0 - x2) + (x2 * x2 + y2 * y2) * (x1 - x0)) / D;

  const center: number[] = [centerX, centerY];
  const radius = dist(center, p0);

  return { center, radius };
}

/**
 * 根据三个控制点生成圆弧坐标。
 *
 * 控制点定义：
 * - controlPoints[0]: 圆弧起点 (P0)
 * - controlPoints[1]: 圆弧终点 (P1)
 * - controlPoints[2]: 圆弧经过点 (P2)，用于确定圆弧方向和弯曲程度
 *
 * @param controlPoints 三个控制点
 * @param segments 圆弧采样点数，默认 64
 * @returns LineString 坐标格式 number[][]
 */
export function buildArc(controlPoints: number[][], segments: number = DEFAULT_SEGMENTS): number[][] {
  if (controlPoints.length < 2) return [];

  const [p0, p1, p2] = controlPoints;

  // 只有两个点时，直接返回直线
  if (!p2) {
    return [p0, p1];
  }

  // 计算外接圆
  const circle = getCircleFromThreePoints(p0, p1, p2);

  // 如果三点共线，退化为直线
  if (!circle) {
    return [p0, p1];
  }

  const { center, radius } = circle;
  if (radius === 0) return [p0, p1];

  // 计算三个点的角度（相对于圆心）
  const angle0 = Math.atan2(p0[1] - center[1], p0[0] - center[0]);
  const angle1 = Math.atan2(p1[1] - center[1], p1[0] - center[0]);
  const angle2 = Math.atan2(p2[1] - center[1], p2[0] - center[0]);

  // 计算从 angle0 到 angle1 的两个可能方向
  // 顺时针方向
  let sweepCW = angle1 - angle0;
  if (sweepCW < 0) sweepCW += Math.PI * 2;

  // 逆时针方向
  let sweepCCW = angle1 - angle0;
  if (sweepCCW > 0) sweepCCW -= Math.PI * 2;

  // 计算 angle2 相对于 angle0 的角度差
  let diff2 = angle2 - angle0;
  if (diff2 < 0) diff2 += Math.PI * 2;

  // 判断 P2 在顺时针还是逆时针方向上
  // 如果 angle2 - angle0 在 [0, sweepCW) 范围内，则 P2 在顺时针弧上
  // 注意：需要考虑边界情况
  const tolerance = 1e-10;
  const isP2OnClockWise = diff2 >= -tolerance && diff2 < sweepCW - tolerance;

  // 选择正确的方向
  // 如果 P2 在顺时针方向上，使用顺时针；否则使用逆时针
  const sweep = isP2OnClockWise ? sweepCW : sweepCCW;

  // 动态计算采样点数，保证平滑（最小32个点）
  const angleSpan = Math.abs(sweep);
  const actualSegments = Math.max(32, Math.ceil(angleSpan * 20));

  // 生成圆弧点
  const ring: number[][] = [];
  for (let i = 0; i <= actualSegments; i++) {
    const angle = angle0 + (sweep * i) / actualSegments;
    ring.push([center[0] + radius * Math.cos(angle), center[1] + radius * Math.sin(angle)]);
  }

  return ring;
}

/**
 * 从圆弧 LineString 反推三个控制点 [p0, p1, p2]。
 *
 * 通过以下方式反推：
 * - p0: 起点
 * - p1: 终点
 * - p2: 取弧长约 1/3 处的点
 */
export function getArcControlPoints(lineString: LineString): number[][] {
  const coordinates = lineString.getCoordinates();
  if (!coordinates || coordinates.length < 3) return [];

  const p0 = coordinates[0];
  const p1 = coordinates[coordinates.length - 1];
  // 取约 1/3 处的点作为经过点
  const idx = Math.floor(coordinates.length / 3);
  const p2 = coordinates[idx];

  return [p0, p1, p2];
}

/**
 * OL Draw 交互的 geometryFunction，用于实时预览圆弧。
 *
 * 使用 LineString 模式（maxPoints: 3）来获取三个坐标：
 * - 第一次点击确定起点 P0
 * - 第二次点击确定终点 P1
 * - 移动鼠标确定圆弧经过点 P2
 *
 * 注意：将原始点击坐标保存到几何的 _plotCoordinates 属性中，
 * 用于后续编辑时恢复用户原始点击位置。
 */
export function createArcGeometryFunction() {
  return (coordinates: number[][], geometry?: LineString): LineString => {
    const geom = geometry || new LineString([]);
    if (coordinates.length < 2) return geom;

    if (coordinates.length === 2) {
      // 只有两个点时，显示直线预览
      geom.setCoordinates(coordinates);
      // 保存原始坐标（只有两个点时）
      (geom as any)._plotCoordinates = [...coordinates];
    } else {
      // 有三个点时，生成圆弧几何，并保存原始三个点击坐标
      const arcCoords = buildArc(coordinates.slice(0, 3));
      geom.setCoordinates(arcCoords);
      // 保存原始的三个点击坐标，用于编辑时恢复用户点击位置
      (geom as any)._plotCoordinates = [...coordinates];
    }
    return geom;
  };
}
