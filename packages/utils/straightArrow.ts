import Polygon from 'ol/geom/Polygon';
import type { Coordinate } from 'ol/coordinate';
import { dist, computeDirectionAndNormal, createDegeneratePolygon } from './arrow';

/** 箭头身体宽度占箭头总长度的比例 */
const BODY_WIDTH_RATIO = 0.1;

/** 箭头头部宽度占箭头总长度的比例 */
const HEAD_WIDTH_RATIO = 0.30;

/** 箭头身体长度占箭头总长度的比例 */
const BODY_LENGTH_RATIO = 0.85;

/** 控制翼展开程度 */
const WING_SCALE = 0.9;

/**
 * 根据两个控制点生成直箭头 Polygon 坐标。
 *
 * 控制点定义：
 *  - controlPoints[0] (P0): 箭尾中心点
 *  - controlPoints[1] (P1): 箭头尖端点
 *
 * 箭头由箭身（矩形）和箭头（三角形）组成，整体为一个闭合 Polygon。
 *
 * 箭头结构示意（沿 P0→P1 方向）：
 * ```
 *          B5 ─────── B4
 *          │           │
 *   P0 ────│───────────│──── P1
 *          │           │    ╱
 *          B0 ─────── B1  ╱
 *                      B2 ╱  (H2)
 *                       ╱
 *                      H1 (P1)
 * ```
 *
 * @param controlPoints - [P0, P1]，箭尾中心点和箭头尖端点
 * @returns Polygon 坐标格式 number[][][]（单环）
 */
export function buildStraightArrow(controlPoints: number[][]): number[][][] {
  const [p0, p1] = controlPoints;
  const length = dist(p0, p1);

  if (length < 1e-10) {
    return createDegeneratePolygon(p0);
  }

  const { dx, dy, nx, ny } = computeDirectionAndNormal(p0, p1, length);

  const bodyHalfWidth = (length * BODY_WIDTH_RATIO) / 2;
  const headHalfWidth = (length * HEAD_WIDTH_RATIO) / 2;
  const bodyLength = length * BODY_LENGTH_RATIO;

  // 身体与头部交界处的中心点
  const bx = p0[0] + dx * bodyLength;
  const by = p0[1] + dy * bodyLength;

  const wingBack = length * 0.02;

  const leftWing = [
    bx + nx * headHalfWidth * WING_SCALE - dx * wingBack,
    by + ny * headHalfWidth * WING_SCALE - dy * wingBack,
  ];

  const rightWing = [
    bx - nx * headHalfWidth * WING_SCALE - dx * wingBack,
    by - ny * headHalfWidth * WING_SCALE - dy * wingBack,
  ];

  // 构建箭头外轮廓
  const ring: number[][] = [
    // 箭身左下角
    [p0[0] + nx * bodyHalfWidth, p0[1] + ny * bodyHalfWidth],
    // 箭身左上角（身体与头部交界处左侧）
    [bx + nx * bodyHalfWidth, by + ny * bodyHalfWidth],
    // 箭头左翼
    leftWing,
    // 箭头尖端
    [p1[0], p1[1]],
    // 箭头右翼
    rightWing,
    // 箭身右下角（身体与头部交界处右侧）
    [bx - nx * bodyHalfWidth, by - ny * bodyHalfWidth],
    // 箭身右上角
    [p0[0] - nx * bodyHalfWidth, p0[1] - ny * bodyHalfWidth],
    // 闭合点（与第一个点相同）
    [p0[0] + nx * bodyHalfWidth, p0[1] + ny * bodyHalfWidth],
  ];

  return [ring];
}

/**
 * 计算直箭头中心点。
 *
 * @param controlPoints - [P0, P1]，箭尾中心点和箭头尖端点
 * @returns 箭头中心坐标
 */
export function getStraightArrowCenter(controlPoints: number[][]): Coordinate {
  const [p0, p1] = controlPoints;
  return [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
}

/**
 * OL Draw 交互的 geometryFunction，用于实时预览直箭头。
 *
 * Draw 交互以 LineString 模式启动（maxPoints: 2），
 * coordinates 在绘制过程中为 [P0, currentPointer]，
 * 本函数将这两个控制点转换为箭头 Polygon 以实现实时预览。
 */
export function createStraightArrowGeometryFunction() {
  return (coordinates: number[][], geometry?: Polygon): Polygon => {
    const geom = geometry || new Polygon([]);
    if (coordinates.length < 2) return geom;
    const controlPoints = coordinates.slice(0, 2);
    geom.setCoordinates(buildStraightArrow(controlPoints));
    geom.set('_controlPoints', controlPoints);
    return geom;
  };
}
