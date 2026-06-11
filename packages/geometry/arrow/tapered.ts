import Polygon from 'ol/geom/Polygon';
import { dist, computeDirectionAndNormal, createDegeneratePolygon } from '../../utils';

/** 箭尾宽度占箭头总长度的比例 */
const TAIL_WIDTH_FACTOR = 0.2;

/** 颈部宽度占箭头总长度的比例 */
const NECK_WIDTH_FACTOR = 0.1;

/** 箭头头部最大宽度占箭头总长度的比例 */
const HEAD_WIDTH_FACTOR = 0.3;

/** 箭头头部长度占箭头总长度的比例 */
const HEAD_LENGTH_FACTOR = 0.22;

/** 箭翼向后收缩比例 */
const HEAD_BACK_FACTOR = 0.04;

/** 箭翼展开程度 */
const WING_SCALE = 0.9;

/**
 * 根据两个控制点生成斜箭头 Polygon
 *
 * controlPoints[0] = 箭尾中心
 * controlPoints[1] = 箭头尖端
 */
export function buildTaperedArrow(controlPoints: number[][]): number[][][] {
  const [p0, p1] = controlPoints;
  const length = dist(p0, p1);

  if (length < 1e-10) {
    return createDegeneratePolygon(p0);
  }

  const { dx, dy, nx, ny } = computeDirectionAndNormal(p0, p1, length);

  const tailHalfWidth = (length * TAIL_WIDTH_FACTOR) / 2;
  const neckHalfWidth = (length * NECK_WIDTH_FACTOR) / 2;
  const headHalfWidth = (length * HEAD_WIDTH_FACTOR) / 2;
  const headLength = length * HEAD_LENGTH_FACTOR;

  // 颈部中心位置
  const neckDistance = length - headLength;
  const neckCenterX = p0[0] + dx * neckDistance;
  const neckCenterY = p0[1] + dy * neckDistance;

  // 箭翼向后收缩
  const wingBack = length * HEAD_BACK_FACTOR;

  // 箭尾
  const tailLeft: number[] = [p0[0] + nx * tailHalfWidth, p0[1] + ny * tailHalfWidth];
  const tailRight: number[] = [p0[0] - nx * tailHalfWidth, p0[1] - ny * tailHalfWidth];

  // 颈部
  const neckLeft: number[] = [neckCenterX + nx * neckHalfWidth, neckCenterY + ny * neckHalfWidth];
  const neckRight: number[] = [neckCenterX - nx * neckHalfWidth, neckCenterY - ny * neckHalfWidth];

  // 箭头翼点
  const headLeft: number[] = [
    neckCenterX + nx * headHalfWidth * WING_SCALE - dx * wingBack,
    neckCenterY + ny * headHalfWidth * WING_SCALE - dy * wingBack,
  ];
  const headRight: number[] = [
    neckCenterX - nx * headHalfWidth * WING_SCALE - dx * wingBack,
    neckCenterY - ny * headHalfWidth * WING_SCALE - dy * wingBack,
  ];

  // 箭尖
  const tip: number[] = [p1[0], p1[1]];

  const ring: number[][] = [tailLeft, neckLeft, headLeft, tip, headRight, neckRight, tailRight, tailLeft];

  return [ring];
}

/**
 * Draw geometryFunction
 */
export function createTaperedArrowGeometryFunction() {
  return (coordinates: number[][], geometry?: Polygon): Polygon => {
    const geom = geometry || new Polygon([]);

    if (coordinates.length < 2) {
      return geom;
    }

    const controlPoints = coordinates.slice(0, 2);
    geom.setCoordinates(buildTaperedArrow(controlPoints));
    geom.set('_controlPoints', controlPoints);

    return geom;
  };
}
